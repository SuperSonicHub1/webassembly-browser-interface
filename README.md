# WebAssembly Browser Interface (WABI)

An attempt to write a specification and tooling to make WebAssembly
a first-class language in the browser instead of a second-class one.

## State of the Repo

### `webidl2wit`

A way to convert WebIDL, the IDL of the web, to the WASM Interface Type, the IDL of WebAssembly.
The tool supports a subset of WebIDL (notably, you cannot nest interfaces yet) and outputs a WIT interface.
Output looks correct to me, but I have yet to verify it with [`wit-bindgen`](https://github.com/bytecodealliance/wit-bindgen).
The I do wonder how reference types will eventually work in this.

## License
All code in this repo is released into the public domain under the Unlicense.
Once I actually start writing in here, I'll probably use CC BY-SA 4.0. 
