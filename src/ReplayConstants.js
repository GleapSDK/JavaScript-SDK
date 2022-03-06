export const REPLAYREC_ADD = "p";
export const REPLAYREC_CANVAS_DATA = "c";
export const REPLAYREC_DELAY = "o";
export const REPLAYREC_FORCE_STYLE_FLUSH = "f";
export const REPLAYREC_INPUT = "i";
export const REPLAYREC_INPUTCHECK = "z";
export const REPLAYREC_MOUSE_MOVE = "m";
export const REPLAYREC_MOUSE_DOWN = "n";
export const REPLAYREC_ATTR = "r";
export const REPLAYREC_TEXT = "t";
export const REPLAYREC_MOUSE_UP = "u";
export const REPLAYREC_REMOVE = "v";
export const REPLAYREC_SCROLL = "s";
export const REPLAYREC_MAINSCROLL = "x";

export function gleapRoughSizeOfObject(object) {
  var objectList = [];
  var stack = [object];
  var bytes = 0;

  while (stack.length) {
    var value = stack.pop();

    if (typeof value === "boolean") {
      bytes += 4;
    } else if (typeof value === "string") {
      bytes += value.length * 2;
    } else if (typeof value === "number") {
      bytes += 8;
    } else if (typeof value === "object" && objectList.indexOf(value) === -1) {
      objectList.push(value);

      for (var i in value) {
        stack.push(value[i]);
      }
    }
  }
  return bytes / 1024 / 1024;
}
