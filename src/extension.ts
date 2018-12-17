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

enum AdjacentLine {
    Previous = -1,
    Next = 1
}

const blockKeywords = ["if", "for", "foreach", "while", "do", "function", "else", "class", "switch", "try", "catch", "with"];

const loopKeywords = ["for", "foreach", "do", "while"];

const suggestions: Array<Suggestion> = [
    // if (...)
    {
        label: "if (@1)...",
        snippet: "if (@1) {\n\t$0\n}",
        languages: ["javascript", "javascriptreact", "typescript", "typescriptreact"],
        when: c => c.previousLineText.match("^let\\s+(\\w+)\\s*=.*")
    },
    {
        label: "if (@1)...",
        snippet: "if (@1) {\n\t$0\n}",
        languages: ["javascript", "javascriptreact", "typescript", "typescriptreact"],
        when: c => c.previousLineText.match("^const\\s+(\\w+)\\s*=.*")
    },
    {
        label: "if (@1)...",
        snippet: "if (@1) {\n\t$0\n}",
        languages: ["javascript", "javascriptreact", "typescript", "typescriptreact"],
        when: c => c.previousLineText.match("^var\\s+(\\w+)\\s*=.*")
    },
    {
        label: "if (@1)...",
        snippet: "if (@1) {\n\t$0\n}",
        languages: ["javascript", "javascriptreact", "typescript", "typescriptreact"],
        when: c => c.previousLineText.match("^(\\w+)\\s*=.*")
    },

    // if (...) [csharp]
    {
        label: "if (@1 == null)...",
        snippet: "if (@1 == null) {\n\t$0\n}",
        languages: ["csharp"],
        when: c => c.previousLineText.match("^var\\s+(\\w+)\\s*=.*")
    },
    {
        label: "if (@1 == null)...",
        snippet: "if (@1 == null) {\n\t$0\n}",
        languages: ["csharp"],
        when: c => c.previousLineText.match("^(\\w+)\\s*=.*")
    },

    // for (...) [javascript, typescript]
    {
        label: "for (let index of @1)...",
        snippet: "for (let ${1:index} of @1) {\n\t$0\n}",
        languages: ["javascript", "javascriptreact", "typescript", "typescriptreact"],
        when: c => c.previousLineText.match("^let\\s+(\\w+)\\s*=.*")
    },
    {
        label: "for (let index of @1)...",
        snippet: "for (let ${1:index} of @1) {\n\t$0\n}",
        languages: ["javascript", "javascriptreact", "typescript", "typescriptreact"],
        when: c => c.previousLineText.match("^const\\s+(\\w+)\\s*=.*")
    },
    {
        label: "for (let index of @1)...",
        snippet: "for (let ${1:index} of @1) {\n\t$0\n}",
        languages: ["javascript", "javascriptreact", "typescript", "typescriptreact"],
        when: c => c.previousLineText.match("^var\\s+(\\w+)\\s*=.*")
    },
    {
        label: "for (let index of @1)...",
        snippet: "for (let ${1:index} of @1) {\n\t$0\n}",
        languages: ["javascript", "javascriptreact", "typescript", "typescriptreact"],
        when: c => c.previousLineText.match("^(\\w+)\\s*=.*")
    },

    // foreach (...) [csharp]
    {
        label: "foreach (var index in @1)...",
        snippet: "foreach (var ${1:index} in @1) {\n\t$0\n}",
        languages: ["csharp"],
        when: c => c.previousLineText.match("^var\\s+(\\w+)\\s*=.*")
    },
    {
        label: "foreach (var index in @1)...",
        snippet: "foreach (var ${1:index} in @1) {\n\t$0\n}",
        languages: ["csharp"],
        when: c => c.previousLineText.match("^(\\w+)\\s*=.*")
    },

    // more suggestions
    {
        label: "else...",
        snippet: "else {\n\t$0\n}",
        when: c => c.previousLineKeyword === "if"
    },
    {
        label: "case...",
        snippet: "case ${1:condition}:\n\t$0\n\tbreak;",
        when: c => c.parentLineKeyword === "switch" || c.previousLineKeyword === "case"
    },
    {
        label: "default...",
        snippet: "default:\n\t$0\n\tbreak;",
        when: c => c.parentLineKeyword === "switch" || c.previousLineKeyword === "case"
    },
    {
        label: "catch...",
        snippet: "catch {\n\t$0\n}",
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

    if (line.isEmptyOrWhitespace) {
        completeBlankLine(editor);
    }
    else {
        completePartialLine(editor);
    }
}

function completeBlankLine(editor: vscode.TextEditor): void {
    const document = editor.document;
    const activeLine = editor.selection.active.line;
    const language = document.languageId;

    const previousLine = getAdjacentLine(document, activeLine, AdjacentLine.Previous);
    const nextLine = getAdjacentLine(document, activeLine, AdjacentLine.Next);
    const parentLines = getParentLines(document, activeLine);

    const context: SuggestionContext = {
        previousLineKeyword: previousLine ? previousLine.keyword : "",
        previousLineText: previousLine ? previousLine.line.text.trim() : "",
        parentLineKeyword: parentLines.length > 0 ? parentLines[0].keyword : "",
        parentLineText: parentLines.length > 0 ? parentLines[0].line.text.trim() : "",
        isWithinLoop: isWithinLoop(parentLines),
        previousLine: previousLine,
        parentLines: parentLines,
        nextLine: nextLine,
    };

    const items = new Array<SnippetQuickPickItem>();

    for (let suggestion of suggestions) {
        if (suggestion.languages && suggestion.languages.indexOf(language) < 0) {
            continue;
        }

        const result = suggestion.when(context);
        if (!result) {
            continue;
        }

        let label = suggestion.label;
        let snippet = suggestion.snippet;

        // if regex matches, replace parameters (@1, @2, ...) with values from the regex
        if (Array.isArray(result)) {
            for (let i = 1; i < result.length; i++) {
                const parameter = result[i];
                label = label.replace("@" + i, parameter);
                snippet = snippet.replace("@" + i, parameter);
            }
        }

        if (document.eol === vscode.EndOfLine.CRLF) {
            snippet = snippet.replace("\n", "\r\n");
        }

        items.push({ label: label, snippet: new vscode.SnippetString(snippet) });
    }

    // todo: add standard snippets to list

    // if nothing is available, show standard snippets
    if (items.length === 0) {
        vscode.commands.executeCommand("editor.action.insertSnippet");
        return;
    }

    vscode.window.showQuickPick<SnippetQuickPickItem>(items, { placeHolder: "Suggestions" }).then(selectedItem => {
        if (selectedItem) {
            editor.insertSnippet(selectedItem.snippet);
        }
    });
}

function completePartialLine(editor: vscode.TextEditor): void {
    const document = editor.document;
    const activeLine = editor.selection.active.line;

    const line = document.lineAt(activeLine);
    const trimmedLineText = line ? line.text.trim() : "";

    let nextTrimmedLineText = "";
    if (activeLine < document.lineCount - 1) {
        const nextLine = document.lineAt(activeLine + 1);
        nextTrimmedLineText = nextLine ? nextLine.text.trim() : "";
    }

    let snippet = "";

    if (blockKeywords.some(keyword => trimmedLineText.startsWith(keyword)) && !(trimmedLineText.endsWith("{") || nextTrimmedLineText.startsWith("{"))) {
        snippet = getClosingParentheses(line) + " {\n\t$0\n}";
    }
    else if (trimmedLineText.endsWith("{")) {
        snippet = "\n\t$0\n}";
    }
    else if (trimmedLineText.endsWith("=>")) {
        snippet = " {\n\t$0\n}";
    }
    else if (!trimmedLineText.endsWith(";")) {
        snippet = getClosingParentheses(line) + ";\n";
    }
    else {
        snippet = "\n";
    }

    if (snippet === "") {
        return;
    }

    if (document.eol === vscode.EndOfLine.CRLF) {
        snippet = snippet.replace("\n", "\r\n");
    }

    editor.insertSnippet(new vscode.SnippetString(snippet), line.range.end);
}

function getClosingParentheses(line: vscode.TextLine): string {
    const trimmedLineText = line.text.trim();
    let openParentheses = 0;

    for (let i = 0; i < trimmedLineText.length; i++) {
        switch (trimmedLineText.charAt(i)) {
            case '(':
                openParentheses++;
                break;
            case ')':
                openParentheses--;
                break;
        }
    }

    return openParentheses > 0 ? ")".repeat(openParentheses) : "";
}

function getLineLevel(line: vscode.TextLine): number {
    return line.firstNonWhitespaceCharacterIndex;
}

function getAdjacentLine(document: vscode.TextDocument, activeLine: number, direction: AdjacentLine): Line | undefined {
    const activeLineLevel = getLineLevel(document.lineAt(activeLine));

    for (let lineNumber = activeLine + direction; lineNumber >= 0 && lineNumber < document.lineCount; lineNumber += direction) {
        const line = document.lineAt(lineNumber);
        if (!isStatement(line)) {
            continue;
        }

        const lineLevel = getLineLevel(line);
        if (lineLevel === activeLineLevel) {
            return new Line(line);
        }

        if (lineLevel < activeLineLevel) {
            return undefined;
        }
    }

    return undefined;
}

function getParentLines(document: vscode.TextDocument, activeLine: number): Line[] {
    let lines = new Array<Line>();
    let activeLineLevel = getLineLevel(document.lineAt(activeLine));

    for (let lineNumber = activeLine - 1; lineNumber >= 0; lineNumber--) {
        const line = document.lineAt(lineNumber);
        if (!isStatement(line)) {
            continue;
        }

        let lineLevel = getLineLevel(line);
        if (lineLevel < activeLineLevel) {
            lines.push(new Line(line));
            activeLineLevel = lineLevel;
        }
    }

    return lines;
}

function isStatement(line: vscode.TextLine): boolean {
    // empty line
    if (line.isEmptyOrWhitespace) {
        return false;
    }

    const trimmedLineText = line.text.trim();

    // comments
    // todo: support for block comments
    if (trimmedLineText.startsWith("//") || trimmedLineText.startsWith("/*") || trimmedLineText.startsWith("*/") || trimmedLineText.startsWith("*")) {
        return false;
    }

    // curly braces
    if (trimmedLineText === "{" || trimmedLineText === "}") {
        return false;
    }

    return true;
}

function isWithinLoop(parentLines: Line[]): boolean {
    return parentLines.some(line => loopKeywords.indexOf(line.keyword) >= 0);
}

class Line {
    private static keywordRegExp = new RegExp("^\\w+");

    public keyword: string = "";

    constructor(public line: vscode.TextLine) {
        const result = Line.keywordRegExp.exec(line.text.trim());
        this.keyword = result ? result[0] : "";
    }
}

export function deactivate() {
}

