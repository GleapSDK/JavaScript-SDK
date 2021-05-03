const blacklist = [
  "https://fonts.googleapis.com",
  "https://cdn.jsdelivr.net",
  "https://cdnjs.cloudflare.com",
  "https://ajax.googleapis.com",
  "https://use.typekit.net",
];

export const isBlacklisted = function (url) {
  if (!url) {
    return false;
  }

  for (var i = 0; i < blacklist.length; i++) {
    if (url.indexOf(blacklist[i]) !== -1) {
      return true;
    }
  }
  return false;
};
