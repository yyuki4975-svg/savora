import type { ExhibitionMedia } from "./regional-longform-exhibitions";

// Editorial photographs for exhibition paths that the published recipe archive cannot
// illustrate yet (for example French bread, which has few catalogue recipes). Every image is
// from Wikimedia Commons with its author and licence; cards still link to a matching recipe
// when one exists, otherwise to an Explore search.
export const regionalPathMedia: Readonly<Record<string, Readonly<Record<string, ExhibitionMedia>>>> = {
  "france": {
    "The loaf": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Baguettes%20-%20stonesoup.jpg?width=1280",
      "alt": "Three baguettes on a wooden board.",
      "credit": "jules / stonesoup · CC BY 2.0",
      "source": "https://commons.wikimedia.org/wiki/File:Baguettes_-_stonesoup.jpg"
    },
    "Flour": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wheat%20flour%2001.jpg?width=1280",
      "alt": "Wheat flour heaped among ears of wheat.",
      "credit": "congerdesign · CC0",
      "source": "https://commons.wikimedia.org/wiki/File:Wheat_flour_01.jpg"
    },
    "Water": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Baker%20woman's%20hands%20kneading%20bread%20dough.jpg?width=1280",
      "alt": "A baker’s hands kneading bread dough on a floured table.",
      "credit": "Shixart1985 · CC BY 2.0",
      "source": "https://commons.wikimedia.org/wiki/File:Baker_woman%27s_hands_kneading_bread_dough.jpg"
    },
    "Salt": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Gu%C3%A9rande%20-%20Comparaison%20en%20Fleur%20de%20sel%20et%20Gros%20sel.JPG?width=1280",
      "alt": "Fleur de sel and coarse sea salt from Guérande, side by side.",
      "credit": "Romain Bréget · CC BY-SA 3.0",
      "source": "https://commons.wikimedia.org/wiki/File:Gu%C3%A9rande_-_Comparaison_en_Fleur_de_sel_et_Gros_sel.JPG"
    },
    "Leaven": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Sourdough%20starter%20at%20day%207.jpg?width=1280",
      "alt": "The bubbly surface of a week-old sourdough starter.",
      "credit": "Guitarbogus · CC BY-SA 4.0",
      "source": "https://commons.wikimedia.org/wiki/File:Sourdough_starter_at_day_7.jpg"
    },
    "Heat": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Baguette%20coocking%20-%20IMG%204272%20(14160296194).jpg?width=1280",
      "alt": "Shaped baguettes on a tray, ready for the oven.",
      "credit": "N i c o l a · CC BY 2.0",
      "source": "https://commons.wikimedia.org/wiki/File:Baguette_coocking_-_IMG_4272_(14160296194).jpg"
    },
    "Regional breads": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Pain%20de%20Campagne.jpg?width=1280",
      "alt": "A sliced pain de campagne beside a bottle of wine.",
      "credit": "grongar · CC BY 2.0",
      "source": "https://commons.wikimedia.org/wiki/File:Pain_de_Campagne.jpg"
    },
    "Nothing wasted": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/French%20toast%20001.jpg?width=1280",
      "alt": "Slices of French toast on a plate.",
      "credit": "Ocdp · CC0",
      "source": "https://commons.wikimedia.org/wiki/File:French_toast_001.jpg"
    },
    "Crust": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Crust%20and%20crumb.jpg?width=1280",
      "alt": "A loaf cut open to show its crust and crumb.",
      "credit": "Belbury · CC BY 4.0",
      "source": "https://commons.wikimedia.org/wiki/File:Crust_and_crumb.jpg"
    },
    "Crumb": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Baguette%20mie.jpg?width=1280",
      "alt": "The open crumb of a cut baguette.",
      "credit": "Popo le Chien · CC BY-SA 4.0",
      "source": "https://commons.wikimedia.org/wiki/File:Baguette_mie.jpg"
    },
    "Daily ritual": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Boulangerie%2C%20Rue%20du%20Pasteur-Wagner%2C%20Paris%202011.jpg?width=1280",
      "alt": "A neighbourhood boulangerie in Paris.",
      "credit": "ParisSharing · CC BY 2.0",
      "source": "https://commons.wikimedia.org/wiki/File:Boulangerie,_Rue_du_Pasteur-Wagner,_Paris_2011.jpg"
    },
    "Regional form": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Baguettes%20d'%C3%A9pi.jpg?width=1280",
      "alt": "Épi baguettes, shaped like ears of wheat.",
      "credit": "Nat · CC BY-SA 4.0",
      "source": "https://commons.wikimedia.org/wiki/File:Baguettes_d%27%C3%A9pi.jpg"
    },
    "Butter & pastry": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Croissant%2C%20whole.jpg?width=1280",
      "alt": "A whole butter croissant.",
      "credit": "SKopp · CC BY-SA 3.0",
      "source": "https://commons.wikimedia.org/wiki/File:Croissant,_whole.jpg"
    }
  },
  "japan": {
    "Season in a box": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Bento%20at%20Hanabishi%2C%20Koyasan.jpg?width=1280",
      "alt": "A bento box served at a temple lodging on Mount Koya.",
      "credit": "Blue Lotus · CC BY 2.0",
      "source": "https://commons.wikimedia.org/wiki/File:Bento_at_Hanabishi,_Koyasan.jpg"
    }
  },
  "mexico": {
    "The market": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Dos%20tipos%20diferentes%20de%20chiles%20en%20el%20Mercado%20Michoac%C3%A1n.jpg?width=1280",
      "alt": "Peppers and chiles on a market stall in Mexico City.",
      "credit": "Xanyssel · CC BY-SA 4.0",
      "source": "https://commons.wikimedia.org/wiki/File:Dos_tipos_diferentes_de_chiles_en_el_Mercado_Michoac%C3%A1n.jpg"
    },
    "The feast": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mole%20poblano%2C%20M%C3%A9xico.JPG?width=1280",
      "alt": "Mole poblano paste for sale in Puebla.",
      "credit": "Adrián Cerón · CC BY-SA 4.0",
      "source": "https://commons.wikimedia.org/wiki/File:Mole_poblano,_M%C3%A9xico.JPG"
    },
    "Maize": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Maices%20nativos%20de%20m%C3%A9xico%2C%20Tlaxcala%20Mexico%202023.jpg?width=1280",
      "alt": "Native maize of many colours at a fair in Tlaxcala.",
      "credit": "Cacu · CC BY-SA 4.0",
      "source": "https://commons.wikimedia.org/wiki/File:Maices_nativos_de_m%C3%A9xico,_Tlaxcala_Mexico_2023.jpg"
    },
    "Chile": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Chiles%20secos%20sobre%20petate%20en%20Oaxaca.jpg?width=1280",
      "alt": "Dried chiles laid out on a woven mat in Oaxaca.",
      "credit": "Juanscott · CC BY-SA 4.0",
      "source": "https://commons.wikimedia.org/wiki/File:Chiles_secos_sobre_petate_en_Oaxaca.jpg"
    },
    "Beans": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/BeansTlaya.JPG?width=1280",
      "alt": "Bags of beans for sale in Tlayacapan, Morelos.",
      "credit": "AlejandroLinaresGarcia · CC BY-SA 4.0",
      "source": "https://commons.wikimedia.org/wiki/File:BeansTlaya.JPG"
    },
    "Squash": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flor%20de%20calabaza%20(6148232245).jpg?width=1280",
      "alt": "A squash blossom in flower.",
      "credit": "Carlos Adampol Galindo · CC BY-SA 2.0",
      "source": "https://commons.wikimedia.org/wiki/File:Flor_de_calabaza_(6148232245).jpg"
    },
    "Tomatillo": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Kluse%20-%20Physalis%20philadelphica%20-%20Tomatillo%2004%20ies.jpg?width=1280",
      "alt": "Tomatillo plants with husked fruit.",
      "credit": "Frank Vincentz · CC BY-SA 3.0",
      "source": "https://commons.wikimedia.org/wiki/File:Kluse_-_Physalis_philadelphica_-_Tomatillo_04_ies.jpg"
    },
    "Mole & salsa": {
      "src": "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mole%20negro%20de%20Oaxaca%20con%20arroz.jpg?width=1280",
      "alt": "Oaxacan mole negro served with rice.",
      "credit": "ProtoplasmaKid · CC BY-SA 4.0",
      "source": "https://commons.wikimedia.org/wiki/File:Mole_negro_de_Oaxaca_con_arroz.jpg"
    }
  }
};
