import type { Options, Commit, Reference, Field, Note, Revert } from "./mod.ts";
import type { ParsingRegex } from "./regex.ts";

const reNewlines = /^(?:\r\n|\n|\r)+|(?:\r\n|\n|\r)+$/g;

function trimOffNewlines(str: string) {
  return str.replace(reNewlines, "");
}

const CATCH_ALL = /()(.+)/gi;
const SCISSOR = "# ------------------------ >8 ------------------------";

function append(src: string | null, line: string) {
  if (src) {
    src += "\n" + line;
  } else {
    src = line;
  }

  return src;
}

function getCommentFilter(char: string) {
  return (line: string) => {
    return line.charAt(0) !== char;
  };
}

function truncateToScissor(lines: string[]) {
  const scissorIndex = lines.indexOf(SCISSOR);

  if (scissorIndex === -1) {
    return lines;
  }

  return lines.slice(0, scissorIndex);
}

function getReferences(input: string, regex: ParsingRegex): Reference[] {
  const references = [];
  let referenceSentences;
  let referenceMatch;

  const reApplicable = input.match(regex.references) !== null
    ? regex.references
    : CATCH_ALL;

  while ((referenceSentences = reApplicable.exec(input))) {
    const action = referenceSentences[1] || null;
    const sentence = referenceSentences[2];

    while ((referenceMatch = regex.referenceParts.exec(sentence))) {
      let owner = null;
      let repository: string | null = referenceMatch[1] || "";
      const ownerRepo = repository.split("/");

      if (ownerRepo.length > 1) {
        owner = ownerRepo.shift()!;
        repository = ownerRepo.join("/");
      }

      repository ||= null;

      const issue = referenceMatch[3];
      const raw = referenceMatch[0];
      const prefix = referenceMatch[2];

      const reference = {
        action,
        owner,
        repository,
        issue,
        raw,
        prefix,
      };

      references.push(reference);
    }
  }

  return references;
}

function passTrough() {
  return true;
}

export function parser(
  raw?: string,
  options?: Required<Options>,
  regex?: ParsingRegex,
): Commit {
  if (!raw || !raw.trim()) {
    throw new TypeError("Expected a raw commit");
  }

  if (!options) {
    throw new TypeError("Expected options");
  }

  if (!regex) {
    throw new TypeError("Expected regexes");
  }

  let mentionsMatch;
  const commentFilter = typeof options.commentChar === "string"
    ? getCommentFilter(options.commentChar)
    : passTrough;

  const rawLines = trimOffNewlines(raw).split(/\r?\n/);
  const lines = truncateToScissor(rawLines).filter(commentFilter);

  let continueNote = false;
  let isBody = true;
  const headerCorrespondence = options.headerCorrespondence?.map((part) => {
    return part.trim();
  });
  const revertCorrespondence = options.revertCorrespondence?.map((field) => {
    return field.trim();
  });
  const mergeCorrespondence = options.mergeCorrespondence?.map((field) => {
    return field.trim();
  });

  const mentions: string[] = [];
  const notes: Note[] = [];
  const references: Reference[] = [];

  let body: Field = null;
  let footer: Field = null;
  let header = null;
  let merge = null;
  let revert: Revert | null = null;

  if (lines.length === 0) {
    return {
      body: body,
      footer: footer,
      header: header,
      mentions: mentions,
      merge: merge,
      notes: notes,
      references: references,
      revert: revert,
      scope: null,
      subject: null,
      type: null,
    } as Commit;
  }

  // msg parts
  merge = lines.shift()!;
  const mergeParts: { [key: string]: string | null } = {};
  const headerParts: { [key: string]: string | null } = {};
  body = "";
  footer = "";

  const mergeMatch = merge.match(options.mergePattern!);
  if (mergeMatch && options.mergePattern) {
    merge = mergeMatch[0];

    header = lines.shift();
    while (!header?.trim()) {
      header = lines.shift();
    }

    mergeCorrespondence?.forEach((partName, index) => {
      const partValue = mergeMatch![index + 1] ?? null;
      mergeParts[partName] = partValue;
    });
  } else {
    header = merge;
    merge = null;

    mergeCorrespondence?.forEach((partName) => {
      mergeParts[partName] = null;
    });
  }

  const headerMatch = header.match(options.headerPattern!);
  if (headerMatch) {
    headerCorrespondence?.forEach((partName, index) => {
      const partValue = headerMatch![index + 1] || null;
      headerParts[partName] = partValue;
    });
  } else {
    headerCorrespondence?.forEach((partName) => {
      headerParts[partName] = null;
    });
  }

  Array.prototype.push.apply(references, getReferences(header, regex));

  // body or footer
  const otherFields: { [key: string]: string } = {};
  let currentProcessedField: string;

  lines.forEach((line) => {
    if (options.fieldPattern) {
      const fieldMatch = options.fieldPattern.exec(line);

      if (fieldMatch) {
        currentProcessedField = fieldMatch[1];

        return;
      }

      if (currentProcessedField) {
        otherFields[currentProcessedField] = append(
          otherFields[currentProcessedField],
          line,
        );

        return;
      }
    }

    let referenceMatched;

    // this is a new important note
    const notesMatch = line.match(regex.notes);
    if (notesMatch) {
      continueNote = true;
      isBody = false;
      footer = append(footer, line);

      const note = {
        title: notesMatch[1],
        text: notesMatch[2],
      };

      notes.push(note);

      return;
    }

    const lineReferences = getReferences(line, regex);

    if (lineReferences.length > 0) {
      isBody = false;
      referenceMatched = true;
      continueNote = false;
    }

    Array.prototype.push.apply(references, lineReferences);

    if (referenceMatched) {
      footer = append(footer, line);

      return;
    }

    if (continueNote) {
      notes[notes.length - 1].text = append(notes[notes.length - 1].text, line);
      footer = append(footer, line);

      return;
    }

    if (isBody) {
      body = append(body, line);
    } else {
      footer = append(footer, line);
    }
  });

  // if (options.breakingHeaderPattern && notes.length === 0) {
  //   let breakingHeader = header.match(options.breakingHeaderPattern);
  //   if (breakingHeader) {
  //     const noteText = breakingHeader[3]; // the description of the change.
  //     notes.push({
  //       title: "BREAKING CHANGE",
  //       text: noteText,
  //     });
  //   }
  // }

  while ((mentionsMatch = regex.mentions.exec(raw))) {
    mentions.push(mentionsMatch[1]);
  }

  // does this commit revert any other commit?
  const revertMatch = raw.match(options.revertPattern!);
  if (revertMatch) {
    revert = {};
    revertCorrespondence?.forEach((partName, index) => {
      const partValue = revertMatch![index + 1] || null;
      revert![partName] = partValue;
    });
  } else {
    revert = null;
  }

  notes.forEach((note) => {
    note.text = trimOffNewlines(note.text);

    return note;
  });

  const msg = Object.assign(
    headerParts,
    mergeParts,
    {
      merge: merge,
      header: header,
      body: body ? trimOffNewlines(body) : null,
      footer: footer ? trimOffNewlines(footer) : null,
      notes: notes,
      references: references,
      mentions: mentions,
      revert: revert,
    },
    otherFields,
  );

  return msg as Commit;
}
