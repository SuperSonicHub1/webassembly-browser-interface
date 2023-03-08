// https://url.spec.whatwg.org/#interface-urlsearchparams
[Exposed=*]
interface URLSearchParams {
  // TODO: Support unions
  // constructor(optional (sequence<sequence<USVString>> or record<USVString, USVString> or USVString) init = "");
  constructor(optional USVString init = "");

  readonly attribute unsigned long size;

  undefined append(USVString name, USVString value);
  undefined delete(USVString name);
  USVString? get(USVString name);
  sequence<USVString> getAll(USVString name);
  boolean has(USVString name);
  undefined set(USVString name, USVString value);

  undefined sort();

  // TODO: Possibly handle iterating over these things?
  // iterable<USVString, USVString>;
  stringifier;
};
