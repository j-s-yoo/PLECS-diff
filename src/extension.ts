/**
 * VS Code extension entry point for PLECS Diff Viewer.
 *
 * Provides:
 * - A status-bar button (like Git Graph) that opens the PLECS Diff panel
 * - Commit selection happens *inside* the webview panel, not via quick-picks
 * - Activates when .plecs files are found in the workspace
 */

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { parsePlecsFile } from './plecsParser';
import { diffCircuits } from './diffEngine';
import { PlecsDiffPanel } from './diffViewPanel';

// ── Git helpers ──

function exec(cmd: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.exec(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  date: string;
  message: string;
}

export async function getCommitsForFile(cwd: string, filePath: string): Promise<GitCommit[]> {
  const relPath = path.relative(cwd, filePath);
  const log = await exec(
    `git log --pretty=format:"%H|%h|%ai|%s" -- "${relPath}"`,
    cwd,
  );
  return log
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [hash, shortHash, date, ...msgParts] = line.split('|');
      return { hash, shortHash, date, message: msgParts.join('|') };
    });
}

export async function getFileAtCommit(cwd: string, filePath: string, commitHash: string): Promise<string> {
  const relPath = path.relative(cwd, filePath);
  return exec(`git show ${commitHash}:"${relPath}"`, cwd);
}

export async function getWorkingCopy(filePath: string): Promise<string> {
  const doc = await vscode.workspace.openTextDocument(filePath);
  return doc.getText();
}

// ── Find .plecs files ──

async function findPlecsFiles(cwd: string): Promise<string[]> {
  const pattern = new vscode.RelativePattern(cwd, '**/*.plecs');
  const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 50);
  return uris.map(u => u.fsPath);
}

// ── Open panel (status bar button or command palette) ──

async function openPlecsDiff(uri?: vscode.Uri) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open.');
    return;
  }
  const cwd = workspaceFolder.uri.fsPath;

  // Determine the .plecs file
  let filePath: string | undefined;

  if (uri) {
    filePath = uri.fsPath;
  } else {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.fileName.endsWith('.plecs')) {
      filePath = activeEditor.document.fileName;
    }
  }

  if (!filePath) {
    const files = await findPlecsFiles(cwd);
    if (files.length === 0) {
      vscode.window.showErrorMessage('No .plecs files found in workspace.');
      return;
    }
    const picks = files.map(f => ({
      label: path.relative(cwd, f),
      detail: f,
    }));
    const selected = await vscode.window.showQuickPick(picks, {
      placeHolder: 'Select a .plecs file to diff',
    });
    if (!selected) return;
    filePath = selected.detail;
  }

  // Get commits
  let commits: GitCommit[];
  try {
    commits = await getCommitsForFile(cwd, filePath);
  } catch {
    vscode.window.showErrorMessage('Failed to get git log. Is this a git repository?');
    return;
  }

  // Open the panel — commit selection happens inside the webview
  PlecsDiffPanel.show(cwd, filePath, commits);
}

// ── Activation ──

export function activate(context: vscode.ExtensionContext) {
  // Status bar button — always visible when extension is active
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '$(git-compare) PLECS Diff';
  statusBarItem.tooltip = 'Open PLECS Diff Viewer';
  statusBarItem.command = 'plecsDiff.open';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('plecsDiff.open', () => openPlecsDiff()),
    vscode.commands.registerCommand('plecsDiff.compareCommits', (uri?: vscode.Uri) => openPlecsDiff(uri)),
  );
}

export function deactivate() {}
