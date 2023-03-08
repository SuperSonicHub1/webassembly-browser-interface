// References:
// https://webidl.spec.whatwg.org/
// https://github.com/WebAssembly/wasi-io
// https://github.com/WebAssembly/WASI/blob/main/docs/WitInWasi.md
// https://github.com/WebAssembly/component-model/blob/main/design/mvp/WIT.md

import { paramCase } from "change-case"
import * as webidl from "webidl2"
import path from "node:path"
import fs from "node:fs/promises"

class ConversionError extends Error {
	node: webidl.IDLRootType | webidl.IDLInterfaceMemberType | webidl.IDLTypeDescription | string
}

/**
 * https://webidl.spec.whatwg.org/#idl-types
 * https://github.com/WebAssembly/component-model/blob/main/design/mvp/WIT.md#types
 */
function typeToWit(type: string): string {
	switch (type) {
		case "ByteString":
		case "DOMString":
		case "USVString":
			return "string"
		
		case "octet":
			return "u8"
		case "byte":
			return "s8"
		case "unsigned short":
			return "u16"
		case "short":
			return "s16"
		case "unsigned long":
			return "u32"
		case "long":
			return "s32"
		case "unsigned long long":
			return "u64"
		case "long long":
			return "s64"
		case "float":
		case "unrestricted float":
			return "float32"
		case "double":
		case "unrestricted double":
			return "float64"
		
		case "boolean":
			return "bool"

		case "undefined":
			return "()"

		default:
			const error = new ConversionError(`Unsupported type "${type}".`)
			error.node = type
			throw error
	}
}

function typeDescriptionToWit(type: webidl.IDLTypeDescription): string {
	const { idlType } = type

	if (Array.isArray(idlType)) {
		if (idlType.length == 1) return typeDescriptionToWit(idlType[0])
		else {
			const error = new ConversionError(`Unsupported IDLTypeDescription.`)
			error.node = type
			throw error
		}
	} 

	if (type.union) {
		const error = new ConversionError(`Unions not currently supported.`)
		error.node = type
		throw error
	}

	const intermediateType = typeToWit(idlType as string)
	
	if (type.generic) {
		switch (type.generic) {
			// Not too sure about FrozenArray and ObservableArray...
			case "FrozenArray":
			case "ObservableArray":
			case "sequence":
				return `list<${intermediateType}>`
			default:
				const error = new ConversionError(`Unsupported generic type "${type.generic}".`)
				error.node = type
				throw error
		}
	} else if (type.nullable) {
		return `option<${intermediateType}>`
	} else {
		return intermediateType
	}
}

function argumentToWit(argument: webidl.Argument): string {
	const intermediateType = typeDescriptionToWit(argument.idlType)
	
	let finalType: string
	if (argument.variadic) {
		finalType = `list<${intermediateType}>`
	} else if (argument.optional) {
		finalType = `option<${intermediateType}>`
	} else {
		finalType = intermediateType
	}

	return `${paramCase(argument.name)}: ${finalType}`
}

function interfaceMemberToWit(member: webidl.IDLInterfaceMemberType): string {
	const webidlInterface = member.parent,
		resource = `${paramCase(webidlInterface.name)}`,
		resourceHandle = `${resource}-handle`
	
	if (member.type == "constructor") {
		return `${resource}-new: func(${member.arguments.map(argumentToWit).join(", ")}) -> ${resourceHandle}`
	} else if (member.type == "attribute") {
		if (member.inherit) {
			const error = new ConversionError(`Inherited attributes not supported.`)
			error.node = member
			throw error
		} else if (member.special) {
			const error = new ConversionError(`Unsupported special attribute ${member.special}.`)
			error.node = member
			throw error
		}

		const get =`${resource}-get-${member.name}: func(handle: ${resourceHandle}) -> ${typeDescriptionToWit(member.idlType)}`
		const set = member.readonly ? "" :  `
		${resource}-get-${member.name}: func(handle: ${resourceHandle}, value: ${typeDescriptionToWit(member.idlType)})`

		return get + set
	} else if (member.type == "operation") {
		if (member.special) {
			switch (member.special) {
				case "stringifier":
					return `${resource}-to-string: func(handle: ${resourceHandle}) -> string`
				default:
					const error = new ConversionError(`Unsupported special attribute ${member.special}.`)
					error.node = member
					throw error
			}
		} else return `${resource}-${member.name}: func(handle: ${resourceHandle}, ${member.arguments.map(argumentToWit).join(", ")})${member.idlType ? ' -> ' + typeDescriptionToWit(member.idlType) : ""}`
	} else {
		const error = new ConversionError(`Unsupported IDLInterfaceMemberType "${member.type}"`)
		error.node = member
		throw error
	}
}

function rootTypeToWit(rootType: webidl.IDLRootType): string {
	if (rootType.type == "interface") {
		const resource = `${paramCase(rootType.name)}`,
			resourceHandle = `${resource}-handle`
		return `/// A ${rootType.name} object.
	///
	/// This [represents a resource](https://github.com/WebAssembly/WASI/blob/main/docs/WitInWasi.md#Resources).
	type ${resourceHandle} = u32

	/// Dispose of the specified \`${resourceHandle}\`, after which it may no longer
	/// be used.
	drop-${resource}: func(this: ${resourceHandle})

	${rootType.members.map(interfaceMemberToWit).join("\n\t")}
`
	} else {
		const error = new ConversionError(`Unsupported IDLRootType "${rootType.type}"`)
		error.node = rootType
		throw error
	}
}

function webidl2wit(tree: webidl.IDLRootType[], interfaceName: string): string {
	return `default interface ${interfaceName} {
	${tree.map(rootTypeToWit).join("\n\t")}
}`
}

const WEBIDL_FILENAME = "./URLSearchParams.webidl"

const fullPath = path.resolve(WEBIDL_FILENAME)
const fileStem = path.basename(fullPath, '.webidl')
const interfaceName = paramCase(fileStem)
const witFilePath = `./${interfaceName}.wit`

const tree = webidl.parse(await fs.readFile(WEBIDL_FILENAME, { encoding: 'utf-8' }))
console.log(tree)

const wit = webidl2wit(tree, interfaceName)
console.log(wit)

await fs.writeFile(witFilePath, wit)
