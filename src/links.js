export const CATEGORIES = ["furniture", "lighting", "decor", "textiles", "materials"];

const RETAILERS = {
  budget: {
    furniture: ["IKEA", "https://www.ikea.com/us/en/search/?q="],
    lighting:  ["Amazon", "https://www.amazon.com/s?k="],
    decor:     ["Amazon", "https://www.amazon.com/s?k="],
    textiles:  ["Walmart", "https://www.walmart.com/search?q="],
    materials: ["Home Depot", "https://www.homedepot.com/s/"],
  },
  recommended: {
    furniture: ["West Elm", "https://www.westelm.com/search/results.html?words="],
    lighting:  ["Wayfair", "https://www.wayfair.com/keyword.php?keyword="],
    decor:     ["Crate & Barrel", "https://www.crateandbarrel.com/search?query="],
    textiles:  ["Crate & Barrel", "https://www.crateandbarrel.com/search?query="],
    materials: ["Home Depot", "https://www.homedepot.com/s/"],
  },
};

export function cleanQuery(query) {
  return String(query ?? "").trim().slice(0, 80).replace(/[^\w\s\-'&,.]/g, "");
}

export function buildLink(tier, category, query) {
  if (!Object.hasOwn(RETAILERS, tier)) return null;
  if (!Object.hasOwn(RETAILERS[tier], category)) return null;
  const [retailer, base] = RETAILERS[tier][category];
  return { retailer, url: base + encodeURIComponent(cleanQuery(query)) };
}
