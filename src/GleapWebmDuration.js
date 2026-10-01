// MediaRecorder writes WebM as a live stream: the Segment Info has no Duration, so players can't
// show the length or seek (Firefox, and Chrome before MP4 recording). This sets the Duration
// (EBML element 0x4489 in Segment > Info) of the finished file. Any surprise in the file leaves it
// as it was: the result is never worse than the input.

const EBML_HEADER = 0x1a45dfa3;
const SEGMENT = 0x18538067;
const SEEK_HEAD = 0x114d9b74;
const SEEK = 0x4dbb;
const SEEK_ID = 0x53ab;
const SEEK_POSITION = 0x53ac;
const CUES = 0x1c53bb6b;
const INFO = 0x1549a966;
const CLUSTER = 0x1f43b675;
const TIMECODE_SCALE = 0x2ad7b1;
const DURATION = 0x4489;
// The Segment Info sits right after the header; this much of the file is plenty to find it.
const HEAD_BYTES = 64 * 1024;

// An EBML variable-length integer: element ids keep their length marker, sizes don't. A size with
// all value bits set means "unknown" (live streams use it for the Segment and Clusters).
const readVint = (bytes, pos, isId) => {
  const first = bytes[pos];
  if (!first) {
    return null;
  }
  let length = 1;
  let marker = 0x80;
  while (!(first & marker)) {
    marker >>= 1;
    length += 1;
  }
  if (length > (isId ? 4 : 8) || pos + length > bytes.length) {
    return null;
  }
  let value = isId ? first : first & (marker - 1);
  let allOnes = (first & (marker - 1)) === marker - 1;
  for (let i = 1; i < length; i++) {
    value = value * 256 + bytes[pos + i];
    allOnes = allOnes && bytes[pos + i] === 0xff;
  }
  return { value, length, unknown: !isId && allOnes };
};

const readElement = (bytes, pos) => {
  const id = readVint(bytes, pos, true);
  const size = id && readVint(bytes, pos + id.length, false);
  if (!size) {
    return null;
  }
  return {
    id: id.value,
    start: pos,
    idLength: id.length,
    size: size.value,
    unknown: size.unknown,
    dataStart: pos + id.length + size.length,
  };
};

// The size in `width` bytes (at least `minWidth`, as few as possible otherwise), or null.
const encodeSize = (value, minWidth) => {
  for (let width = minWidth; width <= 8; width++) {
    if (value < Math.pow(2, 7 * width) - 1) {
      const bytes = new Uint8Array(width);
      let rest = value;
      for (let i = width - 1; i >= 0; i--) {
        bytes[i] = rest % 256;
        rest = Math.floor(rest / 256);
      }
      bytes[0] |= 0x80 >> (width - 1);
      return bytes;
    }
  }
  return null;
};

const readUint = (bytes, pos, size) => {
  let value = 0;
  for (let i = 0; i < size; i++) {
    value = value * 256 + bytes[pos + i];
  }
  return value;
};

const writeUint = (bytes, pos, size, value) => {
  let rest = value;
  for (let i = size - 1; i >= 0; i--) {
    bytes[pos + i] = rest % 256;
    rest = Math.floor(rest / 256);
  }
  return rest === 0;
};

// The SeekPosition entries of a SeekHead ({pos, size, value}), or null when it can't be read or
// points at Cues (cluster positions inside them would move too).
const seekPositions = (bytes, seekHead) => {
  const positions = [];
  for (let pos = seekHead.dataStart; pos < seekHead.dataStart + seekHead.size;) {
    const seek = readElement(bytes, pos);
    if (!seek || seek.unknown) {
      return null;
    }
    for (let at = seek.dataStart; seek.id === SEEK && at < seek.dataStart + seek.size;) {
      const child = readElement(bytes, at);
      if (!child || child.unknown || child.size > 8) {
        return null;
      }
      const value = readUint(bytes, child.dataStart, child.size);
      if (child.id === SEEK_ID && value === CUES) {
        return null;
      }
      if (child.id === SEEK_POSITION) {
        positions.push({ pos: child.dataStart, size: child.size, value });
      }
      at = child.dataStart + child.size;
    }
    pos = seek.dataStart + seek.size;
  }
  return positions;
};

// The file with the Duration set, or null when it can't be done safely.
const withDuration = (blob, bytes, durationMs) => {
  const header = readElement(bytes, 0);
  if (!header || header.id !== EBML_HEADER || header.unknown) {
    return null;
  }
  const segment = readElement(bytes, header.dataStart + header.size);
  if (!segment || segment.id !== SEGMENT) {
    return null;
  }

  const seekHeads = [];
  let info = null;
  for (let pos = segment.dataStart; pos < bytes.length && !info;) {
    const element = readElement(bytes, pos);
    if (!element || element.unknown || element.id === CLUSTER || element.id === CUES) {
      return null;
    }
    if (element.id === SEEK_HEAD) {
      seekHeads.push(element);
    }
    if (element.id === INFO) {
      info = element;
    }
    pos = element.dataStart + element.size;
  }
  const infoEnd = info ? info.dataStart + info.size : 0;
  if (!info || infoEnd > bytes.length) {
    return null;
  }

  let timecodeScale = 1000000;
  let duration = null;
  for (let pos = info.dataStart; pos < infoEnd;) {
    const child = readElement(bytes, pos);
    if (!child || child.unknown || child.dataStart + child.size > infoEnd) {
      return null;
    }
    if (child.id === TIMECODE_SCALE && child.size > 0 && child.size <= 6) {
      timecodeScale = readUint(bytes, child.dataStart, child.size) || timecodeScale;
    }
    if (child.id === DURATION) {
      duration = child;
    }
    pos = child.dataStart + child.size;
  }
  // In Segment ticks: milliseconds with the usual TimecodeScale of 1,000,000 ns.
  const value = (durationMs * 1000000) / timecodeScale;
  const head = bytes.slice();
  const rest = blob.slice(bytes.length);

  if (duration) {
    // Overwrite it in place: nothing moves.
    const view = new DataView(head.buffer);
    if (duration.size === 8) {
      view.setFloat64(duration.dataStart, value);
    } else if (duration.size === 4) {
      view.setFloat32(duration.dataStart, value);
    } else {
      return null;
    }
    return new Blob([head, rest], { type: blob.type });
  }

  // Add one at the end of the Info. Everything after the Info's start moves by the added bytes: a
  // SeekHead before it (MediaRecorder writes none, other muxers do) and a known Segment size follow.
  const element = new Uint8Array(11);
  element.set([0x44, 0x89, 0x88]);
  new DataView(element.buffer).setFloat64(3, value);
  const infoSize = encodeSize(info.size + element.length, info.dataStart - info.start - info.idLength);
  if (!infoSize) {
    return null;
  }
  const infoHeader = new Uint8Array(info.idLength + infoSize.length);
  infoHeader.set(head.subarray(info.start, info.start + info.idLength));
  infoHeader.set(infoSize, info.idLength);
  const added = infoHeader.length - (info.dataStart - info.start) + element.length;
  for (let i = 0; i < seekHeads.length; i++) {
    const positions = seekPositions(bytes, seekHeads[i]);
    if (!positions || seekHeads[i].dataStart + seekHeads[i].size > info.start) {
      return null;
    }
    for (let j = 0; j < positions.length; j++) {
      const target = positions[j];
      if (segment.dataStart + target.value > info.start && !writeUint(head, target.pos, target.size, target.value + added)) {
        return null;
      }
    }
  }
  if (!segment.unknown) {
    const segmentSizeWidth = segment.dataStart - segment.start - segment.idLength;
    const segmentSize = encodeSize(segment.size + added, segmentSizeWidth);
    if (!segmentSize || segmentSize.length !== segmentSizeWidth) {
      return null;
    }
    head.set(segmentSize, segment.start + segment.idLength);
  }
  return new Blob(
    [
      head.subarray(0, info.start),
      infoHeader,
      head.subarray(info.dataStart, infoEnd),
      element,
      head.subarray(infoEnd),
      rest,
    ],
    { type: blob.type }
  );
};

/**
 * The recording with its duration set in the WebM header; the recording as it was when it is not a
 * WebM file this can safely change, or on any error. Never rejects.
 * @param {Blob} blob
 * @param {number} durationMs
 * @returns {Promise<Blob>}
 */
export const fixWebmDuration = (blob, durationMs) => {
  try {
    if (!blob || !(durationMs > 0) || typeof blob.slice !== 'function') {
      return Promise.resolve(blob);
    }
    const head = blob.slice(0, Math.min(blob.size, HEAD_BYTES));
    if (typeof head.arrayBuffer !== 'function') {
      return Promise.resolve(blob);
    }
    return head.arrayBuffer().then(
      (buffer) => {
        try {
          return withDuration(blob, new Uint8Array(buffer), durationMs) || blob;
        } catch (exp) {
          return blob;
        }
      },
      () => blob
    );
  } catch (exp) {
    return Promise.resolve(blob);
  }
};
