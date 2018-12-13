'use strict';

import * as vscode from 'vscode';

const keywordBlocks = ["if", "while", "for", "do", "function", "else", "class", "switch", "try", "catch", "with"];

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.completeLine', () => completeLine());
    context.subscriptions.push(disposable);
}

function completeLine() {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    let line = editor.document.lineAt(editor.selection.active.line);
    if (!line) {
        return;
    }

    let trimmedLine = line.text.trim();
    let nextTrimmedLine = editor.document.lineAt(editor.selection.active.line + 1).text.trim();

    if (trimmedLine === "") {
        vscode.commands.executeCommand('editor.action.insertSnippet');
        return;
    }

    let code = "";
    let position: vscode.Position | undefined = undefined;
    let indent = getIndent(line.text);

    if (keywordBlocks.some(keyword => trimmedLine.startsWith(keyword)) && !(trimmedLine.endsWith("{") || nextTrimmedLine.startsWith("{"))) {
        code = completeParentheses(trimmedLine) + " {\r" + indent.spaces + "\r" + indent.spaces + "}";
        position = new vscode.Position(editor.selection.active.line + 1, indent.position);
    }
    else if (trimmedLine.endsWith("{")) {
        code = "\r" + indent.spaces + "\r" + indent.spaces + "}";
        position = new vscode.Position(editor.selection.active.line + 1, indent.position);
    }
    else if (trimmedLine.endsWith("=>")) {
        code = " {\r" + indent.spaces + "\r" + indent.spaces + "}";
        position = new vscode.Position(editor.selection.active.line + 1, indent.position);
    }
    else if (!trimmedLine.endsWith(";")) {
        code = completeParentheses(trimmedLine) + ";\r" + indent.spaces;
        position = new vscode.Position(editor.selection.active.line + 1, indent.position);
    }
    else {
        code = "\r" + indent.spaces;
        position = new vscode.Position(editor.selection.active.line + 1, indent.position);
    }

    if (code === "") {
        return;
    }

    editor.edit((edit) => {
        edit.replace(line.range, line.text + code);
    }).then(() => {
        if (position && editor) {
            editor.selection = new vscode.Selection(position, position);
        }
    });
}

function completeParentheses(line: string): string {
    let open = 0;

    for (let i = 0; i < line.length; i++) {
        const c = line.substr(i, 1);
        if (c === "(") {
            open++;
        }
        else if (c === ")") {
            open--;
        }
    }

    return open > 0 ? ")".repeat(open) : "";
}

function getIndent(line: string): { spaces: string, position: number } {
    let spaces = "";
    let position = 0;

    let tabSize = vscode.workspace.getConfiguration("editor").get<number>("tabSize");
    if (!tabSize) {
        tabSize = 4;
    }

    for (let i = 0; i < line.length; i++) {
        const c = line.substr(i, 1);
        if (c !== " " && c !== "\t") {
            break;
        }

        spaces += c;
        position += (c === "\t" ? tabSize : 1);
    }

    return { spaces, position };
}

export function deactivate() {
}