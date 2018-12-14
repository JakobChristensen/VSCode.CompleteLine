'use strict';

import * as vscode from 'vscode';

interface Suggestion {
    label: string;
    snippet: string;
    languages?: string[];
    when: (c: SuggestionContext) => boolean | RegExpMatchArray | null;
}

interface SuggestionContext {
    previousLineText: string;
    previousLineKeyword: string;
    parentLineKeyword: string;
    parentLineText: string;
    isWithinLoop: boolean;
    previousLine: Line | undefined;
    parentLines: Line[];
    nextLine: Line | undefined;
}

interface SnippetQuickPickItem extends vscode.QuickPickItem {
    snippet: vscode.SnippetString;
}

const blockKeywords = ["if", "while", "for", "foreach", "do", "function", "else", "class", "switch", "try", "catch", "with"];

const loopKeywords = ["for", "foreach", "do", "while"];

const suggestions: Array<Suggestion> = [
    // if (...)
    {
        label: "if (@1)...",
        snippet: "if (@1) {\r\t$1\r}",
        when: c => c.previousLineText.match("^let\\s+(\\w+)\\s*=.*")
    },
    {
        label: "if (@1)...",
        snippet: "if (@1) {\r\t$1\r}",
        when: c => c.previousLineText.match("^const\\s+(\\w+)\\s*=.*")
    },
    {
        label: "if (@1)...",
        snippet: "if (@1) {\r\t$1\r}",
        when: c => c.previousLineText.match("^var\\s+(\\w+)\\s*=.*")
    },
    {
        label: "if (@1)...",
        snippet: "if (@1) {\r\t$1\r}",
        when: c => c.previousLineText.match("^(\\w+)\\s*=.*")
    },

    // for (...) [javascript, typescript]
    {
        label: "for (let index of @1)...",
        snippet: "for (let ${1:index} of @1) {\r\t$2\r}",
        languages: ["javascript", "javascriptreact", "typescript", "typescriptreact"],
        when: c => c.previousLineText.match("^let\\s+(\\w+)\\s*=.*")
    },
    {
        label: "for (let index of @1)...",
        snippet: "for (let ${1:index} of @1) {\r\t$2\r}",
        languages: ["javascript", "javascriptreact", "typescript", "typescriptreact"],
        when: c => c.previousLineText.match("^const\\s+(\\w+)\\s*=.*")
    },
    {
        label: "for (let index of @1)...",
        snippet: "for (let ${1:index} of @1) {\r\t$2\r}",
        languages: ["javascript", "javascriptreact", "typescript", "typescriptreact"],
        when: c => c.previousLineText.match("^var\\s+(\\w+)\\s*=.*")
    },
    {
        label: "for (let index of @1)...",
        snippet: "for (let ${1:index} of @1) {\r\t$2\r}",
        languages: ["javascript", "javascriptreact", "typescript", "typescriptreact"],
        when: c => c.previousLineText.match("^(\\w+)\\s*=.*")
    },

    // foreach (...) [csharp]
    {
        label: "foreach (var index in @1)...",
        snippet: "foreach (var ${1:index} in @1) {\r\t$2\r}",
        languages: ["csharp"],
        when: c => c.previousLineText.match("^var\\s+(\\w+)\\s*=.*")
    },
    {
        label: "foreach (var index in @1)...",
        snippet: "foreach (var ${1:index} in @1) {\r\t$2\r}",
        languages: ["csharp"],
        when: c => c.previousLineText.match("^(\\w+)\\s*=.*")
    },

    // more suggestions
    {
        label: "else...",
        snippet: "else {\r\t$1\r}",
        when: c => c.previousLineKeyword === "if"
    },
    {
        label: "case...",
        snippet: "case ${1:condition}:\r\t$2\r\tbreak;",
        when: c => c.parentLineKeyword === "switch" || c.previousLineKeyword === "case"
    },
    {
        label: "default...",
        snippet: "default:\r\t$1\r\tbreak;",
        when: c => c.parentLineKeyword === "switch" || c.previousLineKeyword === "case"
    },
    {
        label: "catch...",
        snippet: "catch {\r\t$1\r}",
        when: c => c.previousLineKeyword === "try"
    },
    {
        label: "break",
        snippet: "break;",
        when: c => c.isWithinLoop && !c.nextLine
    },
    {
        label: "continue",
        snippet: "continue;",
        when: c => c.isWithinLoop && !c.nextLine
    },
    {
        label: "return",
        snippet: "return;",
        when: c => !c.nextLine
    }
];

const supportedLanguages = ["typescript", "typescriptreact", "javascript", "javascriptreact", "csharp", "c", "cpp"];

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand("extension.completeLine", () => completeLine());
    context.subscriptions.push(disposable);
}

function completeLine(): void {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
       
    if (supportedLanguages.indexOf(editor.document.languageId) < 0) {
        return;
    }

    let line = editor.document.lineAt(editor.selection.active.line);
    if (!line) {
        return;
    }

    if (line.text.trim() === "") {
        completeEmptyLine(editor);
    }
    else {
        completePartialLine(editor);
    }
}

function completeEmptyLine(editor: vscode.TextEditor): void {
    const previousLine = getPreviousLine(editor.document, editor.selection.active.line);
    const nextLine = getNextLine(editor.document, editor.selection.active.line);
    const parentLines = getParentLines(editor.document, editor.selection.active.line);

    const context: SuggestionContext = {
        previousLineKeyword: previousLine ? previousLine.keyword : "",
        previousLineText: previousLine ? previousLine.trimmedLine : "",
        parentLineKeyword: parentLines.length > 0 ? parentLines[0].keyword : "",
        parentLineText: parentLines.length > 0 ? parentLines[0].trimmedLine : "",
        isWithinLoop: isWithinLoop(parentLines),
        previousLine: previousLine,
        parentLines: parentLines,
        nextLine: nextLine,
    };

    const language = editor.document.languageId;

    let items = new Array<SnippetQuickPickItem>();

    for (let suggestion of suggestions) {
        if (suggestion.languages && suggestion.languages.indexOf(language) < 0)   {
            continue;
        }

        var result = suggestion.when(context);
        if (!result) {
            continue;
        }

        let label = suggestion.label;
        let snippet = suggestion.snippet;

        if (Array.isArray(result)) {
            for (let index = 1; index < result.length; index++) {
                let parameter = result[index];
                label = label.replace("@" + index, parameter);
                snippet = snippet.replace("@" + index, parameter);
            }
        }

        items.push({ label: label, snippet: new vscode.SnippetString(snippet) });
    }

    // todo: add standard snippets to list

    // if nothing is available, show standard snippets
    if (items.length === 0) {
        vscode.commands.executeCommand("editor.action.insertSnippet");
        return;
    }

    vscode.window.showQuickPick<SnippetQuickPickItem>(items).then(selectedItem => {
        if (selectedItem !== undefined) {
            editor.insertSnippet(selectedItem.snippet);
        }
    });
}

function completePartialLine(editor: vscode.TextEditor): void {
    let line = editor.document.lineAt(editor.selection.active.line);
    let trimmedLine = line ? line.text.trim() : "";
    let nextLine = editor.document.lineAt(editor.selection.active.line + 1);
    let nextTrimmedLine = nextLine ? nextLine.text.trim() : "";

    let code = "";
    let position: vscode.Position | undefined = undefined;
    let indent = getIndent(line.text);

    if (blockKeywords.some(keyword => trimmedLine.startsWith(keyword)) && !(trimmedLine.endsWith("{") || nextTrimmedLine.startsWith("{"))) {
        code = getParentheses(trimmedLine) + " {\r" + indent.nestedSpaces + "\r" + indent.spaces + "}";
        position = new vscode.Position(editor.selection.active.line + 1, indent.nestedPosition);
    }
    else if (trimmedLine.endsWith("{")) {
        code = "\r" + indent.nestedSpaces + "\r" + indent.spaces + "}";
        position = new vscode.Position(editor.selection.active.line + 1, indent.nestedPosition);
    }
    else if (trimmedLine.endsWith("=>")) {
        code = " {\r" + indent.nestedSpaces + "\r" + indent.spaces + "}";
        position = new vscode.Position(editor.selection.active.line + 1, indent.nestedPosition);
    }
    else if (!trimmedLine.endsWith(";")) {
        code = getParentheses(trimmedLine) + ";\r" + indent.spaces;
        position = new vscode.Position(editor.selection.active.line + 1, indent.position);
    }
    else {
        code = "\r" + indent.spaces;
        position = new vscode.Position(editor.selection.active.line + 1, indent.position);
    }

    if (code === "") {
        return;
    }

    editor.edit(edit => {
        edit.replace(line.range, line.text + code);
    }).then(() => {
        if (position && editor) {
            editor.selection = new vscode.Selection(position, position);
        }
    });
}

function getIndent(line: string): { spaces: string, position: number, nestedSpaces: string, nestedPosition: number } {
    const tabSize = vscode.workspace.getConfiguration("editor", null).get<number>("tabSize", 4);
    let spaces = "";
    let position = 0;

    for (let i = 0; i < line.length; i++) {
        const c = line.charAt(i);
        if (c !== " " && c !== "\t") {
            break;
        }

        spaces += c;
        position += (c === "\t" ? tabSize : 1);
    }

    let nestedPosition = position + tabSize;
    let nestedSpaces = spaces + " ".repeat(tabSize);

    return { spaces, position, nestedSpaces, nestedPosition };
}

function getIndentLevel(line: string): number {
    const tabSize = vscode.workspace.getConfiguration("editor", null).get<number>("tabSize", 4);
    let level = 0;

    for (let i = 0; i < line.length; i++) {
        const c = line.substr(i, 1);
        if (c === " ") {
            level++;
        }
        else if (c === "\t") {
            level += tabSize;
        }
        else {
            break;
        }
    }

    return level;
}

function getNextLine(document: vscode.TextDocument, activeLine: number): Line | undefined {
    const indentLevel = getIndentLevel(document.lineAt(activeLine).text);

    for (let lineNumber = activeLine + 1; lineNumber < document.lineCount; lineNumber++) {
        let line = document.lineAt(lineNumber).text;
        if (!isStatement(line)) {
            continue;
        }

        let level = getIndentLevel(line);
        if (level < indentLevel) {
            return undefined;
        }

        if (level === indentLevel) {
            return new Line(line);
        }
    }

    return undefined;
}

function getParentheses(line: string): string {
    let open = 0;

    for (let i = 0; i < line.length; i++) {
        switch (line.charAt(i)) {
            case '(':
                open++;
                break;
            case ')':
                open--;
                break;
        }
    }

    return open > 0 ? ")".repeat(open) : "";
}

function getPreviousLine(document: vscode.TextDocument, activeLine: number): Line | undefined {
    const indentLevel = getIndentLevel(document.lineAt(activeLine).text);

    for (let lineNumber = activeLine - 1; lineNumber >= 0; lineNumber--) {
        const line = document.lineAt(lineNumber).text;
        if (!isStatement(line)) {
            continue;
        }

        const level = getIndentLevel(line);
        if (level < indentLevel) {
            return undefined;
        }

        if (level === indentLevel) {
            return new Line(line);
        }
    }

    return undefined;
}

function getParentLines(document: vscode.TextDocument, activeLine: number): Line[] {
    let codeLines = new Array<Line>();
    let indentLevel = getIndentLevel(document.lineAt(activeLine).text);

    for (let lineNumber = activeLine - 1; lineNumber >= 0; lineNumber--) {
        let line = document.lineAt(lineNumber).text;
        if (!isStatement(line)) {
            continue;
        }

        let level = getIndentLevel(line);
        if (level >= indentLevel) {
            continue;
        }

        let codeLine = new Line(line);
        codeLines.push(codeLine);

        indentLevel = level;
    }

    return codeLines;
}

function isStatement(line: string): boolean {
    const trimmedLine = line.trim();

    // empty line
    if (trimmedLine === "") {
        return false;
    }

    // todo: support block comments
    // comments
    if (trimmedLine.startsWith("//") || trimmedLine.startsWith("/*") || trimmedLine.startsWith("*/") || trimmedLine.startsWith("*")) {
        return false;
    }

    // curly braces
    if (trimmedLine === "{" || trimmedLine === "}") {
        return false;
    }

    return true;
}

function isWithinLoop(parentLines: Line[]): boolean {
    for (let line of parentLines) {
        if (loopKeywords.indexOf(line.keyword) >= 0) {
            return true;
        }
    }

    return false;
}

class Line {
    private static keywordRegExp = new RegExp("^\\w+");

    public indent: number = 0;
    public keyword: string = "";
    public trimmedLine: string = "";

    constructor(public line: string) {
        this.trimmedLine = line.trim();

        let result = Line.keywordRegExp.exec(this.trimmedLine);
        this.keyword = result ? result[0] : "";

        this.indent = getIndentLevel(line);
    }
}

export function deactivate() {
}

