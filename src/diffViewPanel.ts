/**
 * Webview panel for displaying PLECS circuit diffs side-by-side
 * with in-panel commit selection and navigation between changes.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { parsePlecsFile } from './plecsParser';
import { DiffResult, diffCircuits } from './diffEngine';
import { renderCircuitSvg } from './circuitRenderer';
import { GitCommit, getFileAtCommit, getWorkingCopy } from './extension';

interface CommitOption {
  hash: string;
  label: string;
  detail: string;
}

export class PlecsDiffPanel {
  public static currentPanel: PlecsDiffPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private cwd: string;
  private filePath: string;
  private commitOptions: CommitOption[];

  private oldHash: string | null = null;
  private newHash: string | null = null;
  private rootDiff: DiffResult | null = null;
  private currentChangeIndex: number = 0;
  private oldCommitLabel: string = '';
  private newCommitLabel: string = '';
  private subsystemPath: string[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    cwd: string,
    filePath: string,
    commits: GitCommit[],
  ) {
    this.panel = panel;
    this.cwd = cwd;
    this.filePath = filePath;

    this.commitOptions = [
      { hash: 'WORKING', label: 'Working Copy', detail: 'Current file on disk' },
      ...commits.map(c => ({
        hash: c.hash,
        label: `${c.shortHash}`,
        detail: `${c.date.substring(0, 10)} — ${c.message}`,
      })),
    ];

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      null,
      this.disposables,
    );

    this.showCommitSelector();
  }

  private get activeDiff(): DiffResult | null {
    if (!this.rootDiff) return null;
    let diff = this.rootDiff;
    for (const name of this.subsystemPath) {
      const sub = diff.subDiffs.get(name);
      if (!sub) break;
      diff = sub;
    }
    return diff;
  }

  public static show(cwd: string, filePath: string, commits: GitCommit[]) {
    const column = vscode.ViewColumn.One;

    if (PlecsDiffPanel.currentPanel) {
      PlecsDiffPanel.currentPanel.cwd = cwd;
      PlecsDiffPanel.currentPanel.filePath = filePath;
      PlecsDiffPanel.currentPanel.commitOptions = [
        { hash: 'WORKING', label: 'Working Copy', detail: 'Current file on disk' },
        ...commits.map(c => ({
          hash: c.hash,
          label: `${c.shortHash}`,
          detail: `${c.date.substring(0, 10)} — ${c.message}`,
        })),
      ];
      PlecsDiffPanel.currentPanel.oldHash = null;
      PlecsDiffPanel.currentPanel.newHash = null;
      PlecsDiffPanel.currentPanel.rootDiff = null;
      PlecsDiffPanel.currentPanel.subsystemPath = [];
      PlecsDiffPanel.currentPanel.currentChangeIndex = 0;
      PlecsDiffPanel.currentPanel.showCommitSelector();
      PlecsDiffPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'plecsDiff',
      `PLECS Diff: ${path.basename(filePath)}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    PlecsDiffPanel.currentPanel = new PlecsDiffPanel(panel, cwd, filePath, commits);
  }

  private async handleMessage(message: any) {
    switch (message.command) {
      case 'selectCommits': {
        const oldHash = message.oldHash;
        const newHash = message.newHash;
        if (!oldHash || !newHash) {
          this.showCommitSelector('Please select both OLD and NEW commits.');
          return;
        }
        if (oldHash === newHash) {
          this.showCommitSelector('Same version selected for both sides. Pick different commits.');
          return;
        }
        await this.loadDiff(oldHash, newHash);
        break;
      }
      case 'changeCommits':
        this.showCommitSelector();
        break;
      case 'prev': {
        const diff = this.activeDiff;
        if (diff && diff.changes.length > 0) {
          this.currentChangeIndex =
            (this.currentChangeIndex - 1 + diff.changes.length) % diff.changes.length;
          this.showDiff();
        }
        break;
      }
      case 'next': {
        const diff = this.activeDiff;
        if (diff && diff.changes.length > 0) {
          this.currentChangeIndex = (this.currentChangeIndex + 1) % diff.changes.length;
          this.showDiff();
        }
        break;
      }
      case 'goto': {
        const diff = this.activeDiff;
        if (diff && message.index !== undefined && message.index >= 0 && message.index < diff.changes.length) {
          this.currentChangeIndex = message.index;
          this.showDiff();
        }
        break;
      }
      case 'enterSub': {
        const diff = this.activeDiff;
        if (diff && message.name && diff.subDiffs.has(message.name)) {
          this.subsystemPath.push(message.name);
          this.currentChangeIndex = 0;
          this.showDiff();
        }
        break;
      }
      case 'goBack':
        if (this.subsystemPath.length > 0) {
          this.subsystemPath.pop();
          this.currentChangeIndex = 0;
          this.showDiff();
        }
        break;
      case 'goToRoot':
        this.subsystemPath = [];
        this.currentChangeIndex = 0;
        this.showDiff();
        break;
    }
  }

  private async loadDiff(oldHash: string, newHash: string) {
    this.oldHash = oldHash;
    this.newHash = newHash;
    this.subsystemPath = [];
    this.currentChangeIndex = 0;

    const oldOpt = this.commitOptions.find(c => c.hash === oldHash);
    const newOpt = this.commitOptions.find(c => c.hash === newHash);
    this.oldCommitLabel = oldOpt ? (oldOpt.hash === 'WORKING' ? 'Working Copy' : `${oldOpt.label} (${oldOpt.detail})`) : oldHash;
    this.newCommitLabel = newOpt ? (newOpt.hash === 'WORKING' ? 'Working Copy' : `${newOpt.label} (${newOpt.detail})`) : newHash;

    // Show loading state
    this.panel.webview.html = this.getLoadingHtml();

    try {
      const oldContent = oldHash === 'WORKING'
        ? await getWorkingCopy(this.filePath)
        : await getFileAtCommit(this.cwd, this.filePath, oldHash);
      const newContent = newHash === 'WORKING'
        ? await getWorkingCopy(this.filePath)
        : await getFileAtCommit(this.cwd, this.filePath, newHash);

      const oldCircuit = parsePlecsFile(oldContent);
      const newCircuit = parsePlecsFile(newContent);
      this.rootDiff = diffCircuits(oldCircuit, newCircuit);

      this.showDiff();
    } catch (err: any) {
      vscode.window.showErrorMessage(`Error loading diff: ${err.message}`);
      this.showCommitSelector(`Error: ${err.message}`);
    }
  }

  private showCommitSelector(errorMsg?: string) {
    this.panel.webview.html = this.getCommitSelectorHtml(errorMsg);
  }

  private showDiff() {
    const diff = this.activeDiff;
    if (!diff) return;

    const oldSvg = renderCircuitSvg(diff.oldCircuit, diff, 'old', this.currentChangeIndex);
    const newSvg = renderCircuitSvg(diff.newCircuit, diff, 'new', this.currentChangeIndex);
    const totalChanges = diff.changes.length;
    const currentChange = totalChanges > 0 ? diff.changes[this.currentChangeIndex] : null;

    this.panel.webview.html = this.getDiffHtml(oldSvg, newSvg, totalChanges, currentChange, diff);
  }

  // ── Commit selector page ──

  private getCommitSelectorHtml(errorMsg?: string): string {
    const fileName = path.basename(this.filePath);
    const relPath = path.relative(this.cwd, this.filePath);

    const commitRowsHtml = this.commitOptions.map(c => {
      const isWorking = c.hash === 'WORKING';
      const icon = isWorking ? '📄' : '⬤';
      const hashDisplay = isWorking ? '' : `<span class="commit-hash">${escapeHtml(c.label)}</span>`;
      return `<div class="commit-row" data-hash="${escapeHtml(c.hash)}">
        <input type="radio" name="oldCommit" value="${escapeHtml(c.hash)}" class="radio-old" title="Select as OLD">
        <input type="radio" name="newCommit" value="${escapeHtml(c.hash)}" class="radio-new" title="Select as NEW">
        <span class="commit-icon">${icon}</span>
        ${hashDisplay}
        <span class="commit-detail">${escapeHtml(c.detail)}</span>
      </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  :root {
    --bg: #1e1e1e; --fg: #cccccc; --border: #404040; --accent: #569cd6;
    --added: #4ec9b0; --removed: #f44747;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px; height: 100vh; display: flex; flex-direction: column;
  }
  .selector-header {
    padding: 16px 24px; background: #252526; border-bottom: 1px solid var(--border);
  }
  .selector-header h1 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
  .selector-header .file-path { font-size: 12px; color: #888; }
  .error-msg { color: var(--removed); font-size: 12px; margin-top: 8px; }

  .column-headers {
    display: flex; align-items: center; padding: 8px 24px; background: #2a2a2a;
    border-bottom: 1px solid var(--border); font-size: 12px; font-weight: 600;
  }
  .col-old { width: 32px; text-align: center; color: var(--removed); }
  .col-new { width: 32px; text-align: center; color: var(--added); }
  .col-rest { flex: 1; padding-left: 8px; }

  .commit-list { flex: 1; overflow-y: auto; }
  .commit-row {
    display: flex; align-items: center; padding: 6px 24px;
    border-bottom: 1px solid #333; cursor: pointer; font-size: 12px;
  }
  .commit-row:hover { background: #2a2d2e; }
  .radio-old, .radio-new { width: 32px; flex-shrink: 0; cursor: pointer; accent-color: var(--accent); }
  .commit-icon { margin: 0 6px; font-size: 10px; color: #888; }
  .commit-hash {
    font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
    color: var(--accent); margin-right: 8px; font-size: 12px;
  }
  .commit-detail { flex: 1; color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .selector-footer {
    padding: 12px 24px; background: #252526; border-top: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px;
  }
  .compare-btn {
    background: var(--accent); color: #fff; border: none; padding: 8px 24px;
    font-size: 14px; font-weight: 600; border-radius: 4px; cursor: pointer;
  }
  .compare-btn:hover { background: #4a8cc7; }
  .compare-btn:disabled { opacity: 0.4; cursor: default; }
  .selection-summary { font-size: 12px; color: #888; }
</style>
</head>
<body>

<div class="selector-header">
  <h1>PLECS Diff Viewer</h1>
  <div class="file-path">${escapeHtml(relPath)}</div>
  ${errorMsg ? `<div class="error-msg">${escapeHtml(errorMsg)}</div>` : ''}
</div>

<div class="column-headers">
  <span class="col-old">OLD</span>
  <span class="col-new">NEW</span>
  <span class="col-rest">Commit</span>
</div>

<div class="commit-list">
  ${commitRowsHtml}
</div>

<div class="selector-footer">
  <button class="compare-btn" id="compare-btn" disabled>Compare</button>
  <span class="selection-summary" id="selection-summary">Select OLD and NEW versions to compare</span>
</div>

<script>
  const vscode = acquireVsCodeApi();
  let oldHash = null, newHash = null;

  function updateSummary() {
    const btn = document.getElementById('compare-btn');
    const summary = document.getElementById('selection-summary');
    if (oldHash && newHash && oldHash !== newHash) {
      btn.disabled = false;
      summary.textContent = 'Ready to compare';
    } else if (oldHash && newHash && oldHash === newHash) {
      btn.disabled = true;
      summary.textContent = 'Cannot compare same version';
    } else {
      btn.disabled = true;
      const parts = [];
      if (!oldHash) parts.push('OLD');
      if (!newHash) parts.push('NEW');
      summary.textContent = 'Select ' + parts.join(' and ') + ' version' + (parts.length > 1 ? 's' : '');
    }
  }

  document.querySelectorAll('.radio-old').forEach(r => {
    r.addEventListener('change', () => { oldHash = r.value; updateSummary(); });
  });
  document.querySelectorAll('.radio-new').forEach(r => {
    r.addEventListener('change', () => { newHash = r.value; updateSummary(); });
  });

  document.getElementById('compare-btn').addEventListener('click', () => {
    vscode.postMessage({ command: 'selectCommits', oldHash, newHash });
  });

  // Double-click a row to quick-select it as NEW (and first un-selected as OLD)
  document.querySelectorAll('.commit-row').forEach(row => {
    row.addEventListener('dblclick', () => {
      const hash = row.dataset.hash;
      if (!oldHash) {
        row.querySelector('.radio-old').checked = true;
        oldHash = hash;
      } else if (!newHash) {
        row.querySelector('.radio-new').checked = true;
        newHash = hash;
      }
      updateSummary();
      if (oldHash && newHash && oldHash !== newHash) {
        vscode.postMessage({ command: 'selectCommits', oldHash, newHash });
      }
    });
  });
</script>
</body>
</html>`;
  }

  // ── Loading page ──

  private getLoadingHtml(): string {
    return `<!DOCTYPE html>
<html><head><style>
  body { background: #1e1e1e; color: #ccc; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
  .spinner { border: 3px solid #333; border-top: 3px solid #569cd6; border-radius: 50%; width: 32px; height: 32px; animation: spin 0.8s linear infinite; margin-right: 12px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style></head>
<body><div class="spinner"></div><span>Loading diff...</span></body>
</html>`;
  }

  // ── Diff view page ──

  private getDiffHtml(
    oldSvg: string,
    newSvg: string,
    totalChanges: number,
    currentChange: { type: string; componentName: string; details: string } | null,
    diff: DiffResult,
  ): string {
    const changeListHtml = diff.changes
      .map((c, i) => {
        const active = i === this.currentChangeIndex ? 'active' : '';
        const icon = getChangeIcon(c.type);
        const enterBtn = c.type === 'subsystem-changed'
          ? ` <button class="enter-sub-btn" data-name="${escapeHtml(c.componentName)}">Enter &gt;</button>`
          : '';
        return `<div class="change-item ${active} change-${c.type}" data-index="${i}">${icon} <strong>${escapeHtml(c.componentName)}</strong>: ${escapeHtml(c.details)}${enterBtn}</div>`;
      })
      .join('');

    const subsystemNames = Array.from(diff.subDiffs.keys());
    const subsystemsInChangeList = new Set(
      diff.changes.filter(c => c.type === 'subsystem-changed').map(c => c.componentName),
    );
    const additionalSubsystems = subsystemNames.filter(n => !subsystemsInChangeList.has(n));
    const subsystemListHtml = additionalSubsystems.length > 0
      ? `<div class="sidebar-header" style="font-size:12px;">Subsystems</div>` +
        additionalSubsystems.map(name =>
          `<div class="change-item change-subsystem-nav">📂 <strong>${escapeHtml(name)}</strong> <button class="enter-sub-btn" data-name="${escapeHtml(name)}">Enter &gt;</button></div>`
        ).join('')
      : '';

    const breadcrumbHtml = this.subsystemPath.length > 0
      ? `<div class="breadcrumb">
          <button class="breadcrumb-btn" onclick="vscode.postMessage({command:'goToRoot'})">Root</button>
          ${this.subsystemPath.map((name, i) => {
            const isLast = i === this.subsystemPath.length - 1;
            return ` &gt; ${isLast ? `<span class="breadcrumb-current">${escapeHtml(name)}</span>` : `<button class="breadcrumb-btn" onclick="vscode.postMessage({command:'goBack'})">${escapeHtml(name)}</button>`}`;
          }).join('')}
         </div>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root {
    --bg: #1e1e1e;
    --fg: #cccccc;
    --border: #404040;
    --accent: #569cd6;
    --added: #4ec9b0;
    --removed: #f44747;
    --changed: #dcdcaa;
    --position: #c586c0;
    --connection: #9cdcfe;
    --highlight: #ffcc0066;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--bg);
    color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    overflow: hidden;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ── Header bar ── */
  .header {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    background: #252526;
    border-bottom: 1px solid var(--border);
    gap: 12px;
    flex-shrink: 0;
  }
  .header h2 { font-size: 14px; font-weight: 600; }
  .nav-btn {
    background: #333;
    border: 1px solid var(--border);
    color: var(--fg);
    padding: 4px 12px;
    cursor: pointer;
    border-radius: 3px;
    font-size: 13px;
  }
  .nav-btn:hover { background: #444; }
  .nav-btn:disabled { opacity: 0.4; cursor: default; }
  .change-counter {
    font-size: 13px;
    color: var(--accent);
    min-width: 60px;
    text-align: center;
  }
  .change-detail {
    flex: 1;
    font-size: 12px;
    color: var(--changed);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .change-commits-btn {
    background: #333;
    border: 1px solid var(--border);
    color: var(--accent);
    padding: 4px 10px;
    cursor: pointer;
    border-radius: 3px;
    font-size: 12px;
  }
  .change-commits-btn:hover { background: #444; }

  /* ── Main content ── */
  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* ── Side-by-side panels ── */
  .panel-container {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
    overflow: hidden;
  }
  .panel:last-child { border-right: none; }
  .panel-header {
    padding: 6px 12px;
    background: #2d2d2d;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    flex-shrink: 0;
  }
  .panel-header.old { color: var(--removed); }
  .panel-header.new { color: var(--added); }
  .svg-container {
    flex: 1;
    overflow: hidden;
    padding: 0;
    position: relative;
    cursor: grab;
  }
  .svg-container.panning { cursor: grabbing; }
  .svg-container svg {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
  }

  /* ── Zoom controls ── */
  .zoom-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }
  .zoom-btn {
    background: #333;
    border: 1px solid var(--border);
    color: var(--fg);
    width: 28px;
    height: 28px;
    cursor: pointer;
    border-radius: 3px;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .zoom-btn:hover { background: #444; }
  .zoom-level {
    font-size: 12px;
    color: #888;
    min-width: 42px;
    text-align: center;
  }

  /* ── Change list sidebar ── */
  .sidebar {
    width: 300px;
    background: #252526;
    border-left: 1px solid var(--border);
    overflow-y: auto;
    flex-shrink: 0;
  }
  .sidebar-header {
    padding: 8px 12px;
    font-weight: 600;
    font-size: 13px;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: #252526;
  }
  .change-item {
    padding: 6px 12px;
    border-bottom: 1px solid #333;
    cursor: pointer;
    font-size: 12px;
    line-height: 1.4;
  }
  .change-item:hover { background: #2a2d2e; }
  .change-item.active { background: #37373d; border-left: 3px solid var(--accent); }
  .change-item strong { font-weight: 600; }
  .change-added { border-left-color: var(--added); }
  .change-removed { border-left-color: var(--removed); }
  .change-param-changed { color: var(--changed); }
  .change-position-changed { color: var(--position); }
  .change-connection-changed { color: var(--connection); }
  .change-sim-param-changed { color: #888; }

  /* ── SVG styles ── */
  .circuit-svg {
    max-width: 100%;
    max-height: 100%;
  }
  .circuit-svg { background: white; }
  .circuit-svg .component { stroke: #222; fill: none; }
  .circuit-svg .symbol-text { fill: #222; stroke: none; }
  .circuit-svg text { font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace; }
  .circuit-svg .comp-label { fill: #444; }
  .circuit-svg .param-label { fill: #666; }
  .circuit-svg .power-wire { stroke: #222; stroke-width: 1.5; }
  .circuit-svg .signal-wire { stroke: #22aa44; stroke-width: 1.5; }
  .circuit-svg .junction { fill: #222; }
  .circuit-svg .annotation { fill: #444; }

  /* Diff highlighting */
  .circuit-svg .diff-added { stroke: var(--added) !important; fill: none; }
  .circuit-svg .diff-added.comp-label,
  .circuit-svg .diff-added.param-label { fill: var(--added) !important; stroke: none !important; }
  .circuit-svg .diff-removed { stroke: var(--removed) !important; fill: none; }
  .circuit-svg .diff-removed.comp-label,
  .circuit-svg .diff-removed.param-label { fill: var(--removed) !important; stroke: none !important; }
  .circuit-svg .diff-param-changed { stroke: var(--changed) !important; fill: none; }
  .circuit-svg .diff-param-changed.comp-label,
  .circuit-svg .diff-param-changed.param-label { fill: var(--changed) !important; stroke: none !important; }
  .circuit-svg .diff-position-changed { stroke: var(--position) !important; fill: none; }
  .circuit-svg .diff-position-changed.comp-label,
  .circuit-svg .diff-position-changed.param-label { fill: var(--position) !important; stroke: none !important; }

  .circuit-svg .ghost-component {
    stroke: var(--position);
    fill: none;
    opacity: 0.3;
    stroke-dasharray: 3, 3;
  }
  .circuit-svg .position-change-line {
    stroke: var(--position);
    stroke-width: 1;
    stroke-dasharray: 4, 4;
    opacity: 0.5;
  }
  .circuit-svg .highlight-ring {
    fill: var(--highlight);
    stroke: #ffcc00;
    stroke-width: 2;
    stroke-dasharray: 6, 3;
  }
  .circuit-svg .change-annotation {
    fill: var(--changed);
    font-style: italic;
  }

  /* No changes state */
  .no-changes {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #888;
    font-size: 16px;
  }

  .shortcut-hint {
    font-size: 11px;
    color: #666;
  }

  /* ── Breadcrumb ── */
  .breadcrumb {
    padding: 4px 16px;
    background: #2a2a2a;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    color: #888;
    flex-shrink: 0;
  }
  .breadcrumb-btn {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font-size: 12px;
    padding: 0 2px;
    text-decoration: underline;
  }
  .breadcrumb-btn:hover { color: #7abcf7; }
  .breadcrumb-current { color: var(--fg); font-weight: 600; }

  .enter-sub-btn {
    background: #333;
    border: 1px solid var(--border);
    color: var(--accent);
    padding: 1px 6px;
    cursor: pointer;
    border-radius: 3px;
    font-size: 11px;
    margin-left: 4px;
  }
  .enter-sub-btn:hover { background: #444; }
  .change-subsystem-changed { color: #ce9178; }
</style>
</head>
<body>

<div class="header">
  <h2>PLECS Diff</h2>
  <button class="change-commits-btn" onclick="vscode.postMessage({command:'changeCommits'})">Change Commits</button>
  ${this.subsystemPath.length > 0 ? `<button class="nav-btn" onclick="vscode.postMessage({command:'goBack'})">&#9664; Back</button>` : ''}
  <button class="nav-btn" onclick="navigate('prev')" ${totalChanges === 0 ? 'disabled' : ''}>&#9664; Prev</button>
  <span class="change-counter">${totalChanges > 0 ? `${this.currentChangeIndex + 1} / ${totalChanges}` : 'No changes'}</span>
  <button class="nav-btn" onclick="navigate('next')" ${totalChanges === 0 ? 'disabled' : ''}>Next &#9654;</button>
  <span class="change-detail">${currentChange ? `${getChangeIcon(currentChange.type)} ${escapeHtml(currentChange.details)}` : ''}</span>
  <span class="shortcut-hint">← → navigate | Esc back</span>
  <div class="zoom-bar">
    <button class="zoom-btn" onclick="zoomBy(-0.2)" title="Zoom out (-)">−</button>
    <span class="zoom-level" id="zoom-level">100%</span>
    <button class="zoom-btn" onclick="zoomBy(0.2)" title="Zoom in (+)">+</button>
    <button class="zoom-btn" onclick="resetView()" title="Reset view (0)" style="font-size:12px;">⟲</button>
  </div>
</div>
${breadcrumbHtml}
<div class="main-content">
  <div class="panel-container">
    <div class="panel">
      <div class="panel-header old">OLD — ${escapeHtml(this.oldCommitLabel)}</div>
      <div class="svg-container" id="old-panel">${oldSvg}</div>
    </div>
    <div class="panel">
      <div class="panel-header new">NEW — ${escapeHtml(this.newCommitLabel)}</div>
      <div class="svg-container" id="new-panel">${newSvg}</div>
    </div>
  </div>
  <div class="sidebar">
    <div class="sidebar-header">Changes (${totalChanges})</div>
    ${totalChanges > 0 ? changeListHtml : '<div class="no-changes">No differences found</div>'}
    ${subsystemListHtml}
  </div>
</div>

<script>
  const vscode = acquireVsCodeApi();

  function navigate(direction) {
    vscode.postMessage({ command: direction });
  }

  document.querySelectorAll('.change-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList && e.target.classList.contains('enter-sub-btn')) return;
      const idx = parseInt(el.dataset.index);
      vscode.postMessage({ command: 'goto', index: idx });
    });
  });

  document.querySelectorAll('.enter-sub-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.name;
      vscode.postMessage({ command: 'enterSub', name: name });
    });
  });

  document.querySelectorAll('.component[data-subsystem="true"]').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const name = el.getAttribute('data-component');
      if (name) vscode.postMessage({ command: 'enterSub', name: name });
    });
  });

  // ── Zoom & Pan state (shared across both panels) ──
  let scale = 1;
  let panX = 0;
  let panY = 0;
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 10;
  const ZOOM_STEP = 0.15;

  const oldPanel = document.getElementById('old-panel');
  const newPanel = document.getElementById('new-panel');
  const zoomLabel = document.getElementById('zoom-level');

  function applyTransform() {
    [oldPanel, newPanel].forEach(panel => {
      const svg = panel.querySelector('svg');
      if (!svg) return;
      svg.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + scale + ')';
    });
    zoomLabel.textContent = Math.round(scale * 100) + '%';
  }

  function zoomAt(delta, cx, cy) {
    const oldScale = scale;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
    const ratio = scale / oldScale;
    panX = cx - ratio * (cx - panX);
    panY = cy - ratio * (cy - panY);
    applyTransform();
  }

  function zoomBy(delta) {
    const rect = oldPanel.getBoundingClientRect();
    zoomAt(delta, rect.width / 2, rect.height / 2);
  }

  function resetView() {
    scale = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  function fitToView() {
    const svg = oldPanel.querySelector('svg');
    if (!svg) return;
    const vb = svg.getAttribute('viewBox');
    if (!vb) return;
    const parts = vb.split(/\\s+/).map(Number);
    const svgW = parts[2], svgH = parts[3];
    const rect = oldPanel.getBoundingClientRect();
    const scaleX = rect.width / svgW;
    const scaleY = rect.height / svgH;
    scale = Math.min(scaleX, scaleY) * 0.95;
    panX = (rect.width - svgW * scale) / 2;
    panY = (rect.height - svgH * scale) / 2;
    applyTransform();
  }

  function onWheel(e) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    zoomAt(delta * scale, cx, cy);
  }
  oldPanel.addEventListener('wheel', onWheel, { passive: false });
  newPanel.addEventListener('wheel', onWheel, { passive: false });

  let isPanning = false;
  let startX = 0, startY = 0;
  let startPanX = 0, startPanY = 0;

  function onPointerDown(e) {
    if (e.button !== 0) return;
    isPanning = true;
    startX = e.clientX;
    startY = e.clientY;
    startPanX = panX;
    startPanY = panY;
    e.currentTarget.classList.add('panning');
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!isPanning) return;
    panX = startPanX + (e.clientX - startX);
    panY = startPanY + (e.clientY - startY);
    applyTransform();
  }
  function onPointerUp(e) {
    if (!isPanning) return;
    isPanning = false;
    oldPanel.classList.remove('panning');
    newPanel.classList.remove('panning');
  }

  [oldPanel, newPanel].forEach(panel => {
    panel.addEventListener('pointerdown', onPointerDown);
    panel.addEventListener('pointermove', onPointerMove);
    panel.addEventListener('pointerup', onPointerUp);
    panel.addEventListener('pointercancel', onPointerUp);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigate('prev');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigate('next');
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoomBy(ZOOM_STEP * scale);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      zoomBy(-ZOOM_STEP * scale);
    } else if (e.key === '0') {
      e.preventDefault();
      resetView();
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      vscode.postMessage({ command: 'goBack' });
    }
  });

  requestAnimationFrame(fitToView);
</script>

</body>
</html>`;
  }

  private dispose() {
    PlecsDiffPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) d.dispose();
  }
}

function getChangeIcon(type: string): string {
  switch (type) {
    case 'added': return '➕';
    case 'removed': return '➖';
    case 'param-changed': return '🔧';
    case 'position-changed': return '📍';
    case 'direction-changed': return '🔄';
    case 'connection-changed': return '🔌';
    case 'subsystem-changed': return '📦';
    case 'sim-param-changed': return '⚙️';
    default: return '•';
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
