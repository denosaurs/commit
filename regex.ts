import { Options, Keywords, Prefixes, Actions } from "./mod.ts";

let reNomatch = /(?!.*)/;

function join(array: string[], joiner: string): string {
  return array
    .map(function (val) {
      return val.trim();
    })
    .filter(function (val) {
      return val.length;
    })
    .join(joiner);
}

function getNotesRegex(noteKeywords?: Keywords): RegExp {
  if (!noteKeywords) {
    return reNomatch;
  }

  return new RegExp(
    "^[\\s|*]*(" + join(noteKeywords as string[], "|") + ")[:\\s]+(.*)",
    "i",
  );
}

function getReferencePartsRegex(
  issuePrefixes?: Prefixes,
  issuePrefixesCaseSensitive?: boolean,
): RegExp {
  if (!issuePrefixes) {
    return reNomatch;
  }

  let flags = issuePrefixesCaseSensitive ? "g" : "gi";
  return new RegExp(
    "(?:.*?)??\\s*([\\w-\\.\\/]*?)??(" +
      join(issuePrefixes as string[], "|") +
      ")([\\w-]*\\d+)",
    flags,
  );
}

function getReferencesRegex(referenceActions?: Actions): RegExp {
  if (!referenceActions) {
    // matches everything
    return /()(.+)/gi;
  }

  let joinedKeywords = join(referenceActions as string[], "|");
  return new RegExp(
    "(" + joinedKeywords + ")(?:\\s+(.*?))(?=(?:" + joinedKeywords + ")|$)",
    "gi",
  );
}

export interface ParsingRegex {
  notes: RegExp;
  referenceParts: RegExp;
  references: RegExp;
  mentions: RegExp;
}

export function regex(options: Options): ParsingRegex {
  options = options || {};
  let reNotes = getNotesRegex(options.noteKeywords);
  let reReferenceParts = getReferencePartsRegex(
    options.issuePrefixes,
    options.issuePrefixesCaseSensitive,
  );
  let reReferences = getReferencesRegex(options.referenceActions);

  return {
    notes: reNotes,
    referenceParts: reReferenceParts,
    references: reReferences,
    mentions: /@([\w-]+)/g,
  };
}
