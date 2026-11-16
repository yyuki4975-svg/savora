import type { ExhibitionMedia } from "./regional-longform-exhibitions";

// Explicit topic-to-photograph assignments; never borrow a neighboring card's asset.
// Source descriptions, authors and licenses checked on Wikimedia Commons, 2026-10-09.
export const mexicoSignatureMedia: Readonly<Record<string, ExhibitionMedia>> = {
  Maize: {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Tortillas_de_maiz_blanco_(México)_01.jpg?width=1200",
    alt: "Corn tortillas", credit: "ProtoplasmaKid · CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Tortillas_de_maiz_blanco_(México)_01.jpg",
  },
  Chile: {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/DriedChilesMerced.JPG?width=1280",
    alt: "Dried chili peppers", credit: "Thelmadatter · CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:DriedChilesMerced.JPG",
  },
  Acid: {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Tomatillo.jpg?width=1280",
    alt: "Tomatillo", credit: "Molekuel · Public domain",
    source: "https://commons.wikimedia.org/wiki/File:Tomatillo.jpg",
  },
  Beans: {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Frijoles.jpg?width=1280",
    alt: "Beans", credit: "Dahyana Yasada R. R. · CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Frijoles.jpg",
  },
  Mole: {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mole_Poblano.jpg?width=1280",
    alt: "Mole", credit: "Melissa Doroquez · CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Mole_Poblano.jpg",
  },
  "Cacao & sweet": {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Chocolate_Atole.jpg?width=1280",
    alt: "Cacao & sweet", credit: "Verónica Janeth Suárez Zaragoza · CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Chocolate_Atole.jpg",
  },
};
