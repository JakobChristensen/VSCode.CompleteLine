# Complete Line

For partial lines of code, this extension completes the line with parentheses, curly braces and semi-colons.

For blank lines, it provides suggestions for a new line of code based on the previous line of code.

Only C-like languages (JavaScript, Typescript, C#, C and C++) are supported. The extension does not do
proper language analysis, but uses indentation to figure out code structure.

This extension is heavily inspired by the Complete Statement functionality in JetBrains Resharper.

## Complete a partial line of code

If the caret is located on a non-blank line, the extension will try to append parentheses, curly braces and 
semi-colons to make a valid line of code.

Suppose the caret is located on this line of code:
```
if (text.startsWith('A'
```

If you press Ctrl+Shift+Enter, the extension will insert two parentheses and a pair of curly braces and 
position the caret inside the braces:

```
if (text.startsWith('A')) {

}
```

## Complete a blank line

If the caret is located on a blank line, the extension suggests a new line of code based on the previous 
line. 

Suppose the caret is located on the blank line after this assigment statement.
```
const startsWithA = text.startsWith('A');

```
If you press Ctrl+Alt+Enter, the extension will suggest an `if` statement (and other statements), resulting in this code:

```
const startsWithA = text.startsWith('A');
if (startsWithA) {

}
```

Suppose you press Ctrl+Alt+Enter again inside the curly braces, the extension will suggest a `return` statement, 
resulting in this code:
```
const startsWithA = text.startsWith('A');
if (startsWithA) {
    return;
}
```

Inside loop statements (`for`, `foreach`, `while`, `do`) , the extension suggests `break` and `continue` statements.

```
for (let i = 0; i < text.length; i++) {
    if (i > 10) {

    }
}
```
When you press Ctrl+Alt+Enter and select `break`.
```
for (let i = 0; i < text.length; i++) {
    if (i > 10) {
        break;        
    }
}
```

PLEASE NOTICE: The extension does not perform proper language analysis. Instead it uses indentation to figure
out the code structure. If you uses 'special' indentation rules or like to break code across multiple lines,
the extention will probably not work as intended.

## Rules

* After an assignment, suggest an `if (...)` statement
* After an assignment, suggest a `for (let index of ...)` statement
* After an assignment, suggest a `foreach (var index in...)` statement (C# only)
* After an `if` statement, suggest an `else` clause
* Inside a `switch` statement, suggest a `case` clause
* Inside a `switch` statement, suggest a `default` clause
* After a `try` statement, suggest a `catch` clause
* At the last line of a block, suggest a `return` statement
* Inside a loop and at the last line of a block, suggest a `break` statement
* Inside a loop and at the last line of a block, suggest a `continue` statement

## Release Notes

### 1.0.0

Initial release.
