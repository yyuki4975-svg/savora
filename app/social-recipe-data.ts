import { dishes } from "./data";

export type SocialRecipeSeed = {
  id: string;
  name: string;
  area: string;
  category: string;
  image: string;
  imageVerified: boolean;
  imageSubject: string;
  source: string;
  sourceUrl: string;
  platform: "YouTube" | "Reddit";
  social: true;
  taste: string;
  texture: string;
  origin: string;
  flag: string;
  searchText: string;
  summary: string;
  researchPrompt: string;
  discussion: Array<{ title: string; body: string }>;
};

const areaImageSlugs: Record<string, string> = {
  American: "tacos-al-pastor", British: "carbonara", Canadian: "feijoada", Chinese: "mapo-tofu",
  Croatian: "carbonara", Dutch: "ratatouille", Egyptian: "tagine", Filipino: "rendang",
  French: "ratatouille", Greek: "tagine", Indian: "butter-chicken", Irish: "feijoada",
  Italian: "carbonara", Jamaican: "tacos-al-pastor", Japanese: "ramen", Kenyan: "tagine",
  Malaysian: "rendang", Mexican: "tacos-al-pastor", Moroccan: "tagine", Polish: "carbonara",
  Portuguese: "feijoada", Russian: "feijoada", Spanish: "carbonara", Thai: "green-curry",
  Tunisian: "tagine", Turkish: "kebab", Ukrainian: "feijoada", Uruguayan: "feijoada",
  Vietnamese: "pho", Indonesian: "rendang", Korean: "bibimbap", Brazilian: "feijoada",
};

function normalizeImageDishName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function foodImageFor(area: string, dishName: string) {
  const exactDish = dishes.find((dish) => normalizeImageDishName(dish.name) === normalizeImageDishName(dishName));
  if (exactDish) return { image: exactDish.image, verified: true, subject: exactDish.name };
  const slug = areaImageSlugs[area];
  const regionalReference = dishes.find((dish) => dish.slug === slug) ?? dishes[0];
  return { image: regionalReference.image, verified: false, subject: `${area} culinary context` };
}

const regionalDishes: Record<string, string[]> = {
  American: ["Gumbo", "Jambalaya", "Shrimp and grits", "New England clam chowder", "Pulled pork", "Southern cornbread", "Biscuits and gravy", "Buffalo wings", "Key lime pie", "Macaroni and cheese", "Meatloaf", "Apple pie"],
  British: ["Lancashire hotpot", "Steak and kidney pie", "Toad in the hole", "Cornish pasty", "Cullen skink", "Welsh rarebit", "Kedgeree", "Bubble and squeak", "Bakewell tart", "Eton mess", "Sticky toffee pudding", "Yorkshire pudding"],
  Canadian: ["Poutine", "Tourtière", "Nanaimo bars", "Butter tarts", "Peameal bacon sandwich", "Montreal smoked meat", "Split pea soup", "Bannock", "Halifax donair", "Jiggs dinner", "Maple taffy", "Rappie pie"],
  Chinese: ["Mapo tofu", "Kung pao chicken", "Dongpo pork", "Char siu", "Xiaolongbao", "Dan dan noodles", "Cantonese steamed fish", "Red-braised pork", "Scallion pancakes", "Hot and sour soup", "Hainanese chicken rice", "Tomato and egg stir-fry"],
  Croatian: ["Peka", "Pašticada", "Black risotto", "Zagorski štrukli", "Čobanac", "Istrian fuži", "Soparnik", "Dalmatian brudet", "Fritule", "Punjene paprike", "Skradin risotto", "Istrian maneštra"],
  Dutch: ["Stamppot", "Bitterballen", "Erwtensoep", "Poffertjes", "Stroopwafel", "Hachee", "Hutspot", "Kibbeling", "Dutch appeltaart", "Slavink", "Kapsalon", "Oliebollen"],
  Egyptian: ["Koshari", "Ful medames", "Molokhia", "Ta'ameya", "Egyptian fattah", "Hawawshi", "Mahshi", "Besarah", "Roz bel laban", "Om Ali", "Macarona béchamel", "Alexandrian liver"],
  Filipino: ["Chicken adobo", "Sinigang", "Kare-kare", "Sisig", "Lechon", "Pancit bihon", "Laing", "Kinilaw", "Tortang talong", "Pinakbet", "Lumpiang Shanghai", "Chicken inasal"],
  French: ["Coq au vin", "Bouillabaisse", "Cassoulet", "Beef bourguignon", "Ratatouille", "Quiche Lorraine", "Salade niçoise", "Tarte Tatin", "Sole meunière", "Croque monsieur", "Gratin dauphinois", "Crêpes Suzette"],
  Greek: ["Moussaka", "Souvlaki", "Spanakopita", "Gemista", "Pastitsio", "Avgolemono", "Fasolada", "Kleftiko", "Dolmades", "Kolokithokeftedes", "Galaktoboureko", "Loukoumades"],
  Indian: ["Butter chicken", "Chole bhature", "Aloo gobi", "Hyderabadi biryani", "Masala dosa", "Rogan josh", "Palak paneer", "Pav bhaji", "Dal makhani", "Goan fish curry", "Vada pav", "Rajma chawal"],
  Irish: ["Irish stew", "Dublin coddle", "Colcannon", "Boxty", "Soda bread", "Seafood chowder", "Barmbrack", "Champ", "Bacon and cabbage", "Beef and stout pie", "Leek and potato soup", "Apple cake"],
  Italian: ["Carbonara", "Cacio e pepe", "Risotto alla Milanese", "Lasagne verdi", "Osso buco", "Pizza napoletana", "Pasta alla Norma", "Ribollita", "Saltimbocca", "Arancini", "Focaccia", "Tiramisu"],
  Jamaican: ["Jerk chicken", "Ackee and saltfish", "Curry goat", "Brown stew chicken", "Escovitch fish", "Rice and peas", "Jamaican patties", "Pepper pot soup", "Festival", "Callaloo", "Run down", "Gizzada"],
  Japanese: ["Shoyu ramen", "Sushi", "Tempura", "Tonkatsu", "Okonomiyaki", "Takoyaki", "Oyakodon", "Nikujaga", "Miso soup", "Karaage", "Sukiyaki", "Onigiri"],
  Kenyan: ["Ugali", "Sukuma wiki", "Nyama choma", "Kenyan pilau", "Githeri", "Mukimo", "Chapati", "Mandazi", "Kachumbari", "Matoke stew", "Bhajia", "Maharagwe"],
  Malaysian: ["Nasi lemak", "Char kway teow", "Laksa", "Beef rendang", "Hainanese chicken rice", "Roti canai", "Mee goreng", "Satay", "Nasi kerabu", "Curry laksa", "Ayam percik", "Kuih seri muka"],
  Mexican: ["Tacos al pastor", "Mole poblano", "Pozole rojo", "Chiles en nogada", "Tamales", "Birria", "Cochinita pibil", "Enchiladas verdes", "Tlayudas", "Sopa de tortilla", "Carnitas", "Chilaquiles"],
  Moroccan: ["Lamb tagine", "Couscous tfaya", "Harira", "Chicken pastilla", "Rfissa", "Tanjia", "Zaalouk", "Bissara", "Mechoui", "Chermoula fish", "Baghrir", "Msemen"],
  Polish: ["Pierogi", "Żurek", "Bigos", "Gołąbki", "Kotlet schabowy", "Barszcz czerwony", "Placki ziemniaczane", "Kopytka", "Flaki", "Pączki", "Sernik", "Makowiec"],
  Portuguese: ["Bacalhau à Brás", "Caldo verde", "Francesinha", "Arroz de marisco", "Cataplana", "Bifana", "Polvo à lagareiro", "Açorda", "Pastéis de nata", "Sardinhas assadas", "Cozido à portuguesa", "Bolinhos de bacalhau"],
  Russian: ["Pelmeni", "Shchi", "Blini", "Beef Stroganoff", "Solyanka", "Olivier salad", "Pirozhki", "Golubtsy", "Kasha", "Ukha", "Syrniki", "Medovik"],
  Spanish: ["Paella valenciana", "Tortilla española", "Gazpacho", "Fabada asturiana", "Pulpo a la gallega", "Croquetas", "Patatas bravas", "Pisto", "Bacalao al pil pil", "Gambas al ajillo", "Churros", "Crema catalana"],
  Thai: ["Green curry", "Pad kra pao", "Tom yum goong", "Pad Thai", "Massaman curry", "Som tam", "Khao soi", "Boat noodles", "Larb", "Tom kha gai", "Mango sticky rice", "Kai jeow"],
  Tunisian: ["Lablabi", "Brik à l'oeuf", "Ojja merguez", "Slata mechouia", "Kafteji", "Rouz Jerbi", "Shorba frik", "Tunisian couscous", "Fricassé", "Loubia", "Kamounia", "Makroudh"],
  Turkish: ["Adana kebab", "Mantı", "İmam bayıldı", "Lahmacun", "Pide", "Mercimek çorbası", "Karnıyarık", "Menemen", "Hünkar beğendi", "Çılbır", "Börek", "Baklava"],
  Ukrainian: ["Borshch", "Varenyky", "Holubtsi", "Deruny", "Syrnyky", "Chicken Kyiv", "Banosh", "Kapusniak", "Nalysnyky", "Kutia", "Pampushky", "Lviv cheesecake"],
  Uruguayan: ["Chivito canadiense", "Asado", "Milanesa", "Torta frita", "Pascualina", "Fainá", "Matambre a la leche", "Revuelto Gramajo", "Guiso criollo", "Canelones", "Capeletis a la Caruso", "Martín Fierro dessert"],
  Vietnamese: ["Phở bò", "Bún chả", "Bánh mì", "Gỏi cuốn", "Bún bò Huế", "Cơm tấm", "Bánh xèo", "Cá kho tộ", "Chả cá", "Hủ tiếu", "Bánh cuốn", "Thịt kho trứng"],
  Indonesian: ["Beef rendang", "Nasi goreng", "Sate ayam", "Gado-gado", "Soto ayam", "Rawon", "Pempek", "Gudeg", "Opor ayam", "Ayam goreng", "Martabak", "Dendeng balado"],
  Korean: ["Bibimbap", "Bulgogi", "Kimchi jjigae", "Tteokbokki", "Japchae", "Samgyeopsal", "Sundubu jjigae", "Dakgalbi", "Pajeon", "Gimbap", "Galbi", "Doenjang jjigae"],
  Brazilian: ["Feijoada", "Moqueca", "Pão de queijo", "Brigadeiro", "Coxinha", "Acarajé", "Vatapá", "Farofa", "Bobó de camarão", "Baião de dois", "Escondidinho", "Quindim"],
};

const regionalDishExtras: Record<string, string[]> = {
  American: ["Philly cheesesteak", "Chicago deep-dish pizza", "New York pizza", "Reuben sandwich", "Cobb salad", "Chicken and waffles", "Texas chili", "Lobster roll", "Po'boy", "Beignets", "Hoppin' John", "Nashville hot chicken", "Maryland crab cakes", "Cioppino", "New Mexico green chile stew", "Pecan pie", "Banana pudding", "S'mores"],
  British: ["Shepherd's pie", "Cottage pie", "Fish and chips", "Full English breakfast", "Scotch egg", "Welsh cawl", "Haggis", "Bangers and mash", "Ploughman's lunch", "Melton Mowbray pork pie", "Eccles cakes", "English trifle", "Treacle tart", "Spotted dick", "Crumpets", "Scones", "Victoria sponge", "Christmas pudding"],
  Canadian: ["Montreal bagels", "Pouding chômeur", "Québec sugar pie", "Blueberry grunt", "Atlantic lobster roll", "Candied salmon", "Newfoundland toutons", "Figgy duff", "Chicken fricot", "Acadian poutine râpée", "Saskatoon berry pie", "Flapper pie", "Thunder Bay persians", "Ginger beef", "Québec cretons", "Oreilles de crisse", "Pets de sœur", "Acadian ployes"],
  Chinese: ["Peking duck", "Biangbiang noodles", "Lion's head meatballs", "Fish-fragrant eggplant", "Twice-cooked pork", "Beggar's chicken", "West Lake vinegar fish", "Cantonese claypot rice", "Wonton noodles", "Zhajiangmian", "Roujiamo", "Baozi", "Jianbing", "Century egg congee", "Century egg tofu", "Salt-and-pepper squid", "Buddha's delight", "Mooncakes"],
  Croatian: ["Zagrebački odrezak", "Kremšnita", "Škampi na buzaru", "Istrian truffle pasta", "Gregada", "Sinjski arambaši", "Croatian sarma", "Vitalac", "Šporki makaruli", "Dubrovačka rožata", "Rapska torta", "Makovnjača", "Orehnjača", "Kroštule", "Pinca", "Kaštradina", "Bakalar na bijelo", "Turkey with mlinci"],
  Dutch: ["Kroket", "Dutch pannenkoeken", "Uitsmijter", "Spekkoek", "Boterkoek", "Advocaat", "Ontbijtkoek", "Beschuit met muisjes", "Patat oorlog", "Kaassoufflé", "Broodje haring", "Rodekool met appeltjes", "Zuurkoolstamppot", "Asperges met ham", "Wentelteefjes", "Vla", "Tompouce", "Bossche bol"],
  Egyptian: ["Hamam mahshi", "Kebab halla", "Torly", "Qolqas", "Feteer meshaltet", "Aish baladi", "Egyptian shakshuka", "Sayadeya", "Mombar", "Roz me'ammar", "Shorbet ads", "Mesaqa'a", "Egyptian baba ghanoush", "Dukkah", "Basbousa", "Kunafa", "Kahk", "Ghorayeba"],
  Filipino: ["Bicol express", "Dinuguan", "Caldereta", "Mechado", "Afritada", "Tinola", "Bulalo", "Batchoy", "Pancit palabok", "Bopis", "Dinakdakan", "Pork humba", "Ginisang monggo", "Pininyahang manok", "Tapsilog", "Arroz caldo", "Champorado", "Halo-halo"],
  French: ["French onion soup", "Duck confit", "Choucroute garnie", "Blanquette de veau", "Pot-au-feu", "Navarin d'agneau", "Pissaladière", "Gougères", "Socca", "Aligot", "Brandade de morue", "Steak frites", "Croque madame", "Clafoutis", "Canelés", "Paris-Brest", "Madeleines", "Kouign-amann"],
  Greek: ["Youvetsi", "Stifado", "Briam", "Fasolakia", "Gigantes plaki", "Horiatiki salad", "Taramosalata", "Skordalia", "Tiropita", "Soutzoukakia", "Kokoretsi", "Saganaki", "Greek baklava", "Kourabiedes", "Melomakarona", "Portokalopita", "Revani", "Tsoureki"],
  Indian: ["Tandoori chicken", "Chicken tikka masala", "Samosa", "Pani puri", "Dhokla", "Idli", "Sambar", "Pesarattu", "Puttu", "Appam", "Chettinad chicken", "Vindaloo", "Kadai paneer", "Malai kofta", "Baingan bharta", "Khichdi", "Gulab jamun", "Jalebi"],
  Irish: ["Shepherd's pie", "Irish black pudding", "Full Irish breakfast", "Dublin Bay prawns", "Irish mussels", "Irish smoked salmon", "Potato farls", "Spice bag", "Irish jambons", "Chicken fillet roll", "Drisheen", "Crubeens", "Gur cake", "Porter cake", "Irish bread pudding", "Rhubarb crumble", "Yellowman", "Irish coffee"],
  Italian: ["Pasta all'amatriciana", "Pasta puttanesca", "Pesto Genovese", "Ragù Bolognese", "Potato gnocchi", "Tortellini in brodo", "Bistecca alla Fiorentina", "Polenta", "Caponata", "Parmigiana di melanzane", "Porchetta", "Vitello tonnato", "Supplì", "Cannoli", "Panna cotta", "Zabaglione", "Panettone", "Affogato"],
  Jamaican: ["Jamaican oxtail stew", "Curry chicken", "Fish tea", "Mannish water", "Stamp and go", "Bammy", "Coco bread", "Hard dough bread", "Solomon gundy", "Jamaican steamed fish", "Ital stew", "Red peas soup", "Fried dumplings", "Plantain tart", "Toto", "Jamaican rum cake", "Sweet potato pudding", "Grater cake"],
  Japanese: ["Kake udon", "Zaru soba", "Yakisoba", "Yakitori", "Gyudon", "Katsudon", "Chawanmushi", "Tamagoyaki", "Yosenabe", "Shabu-shabu", "Unadon", "Saba misoni", "Ochazuke", "Japanese curry rice", "Dorayaki", "Taiyaki", "Daifuku mochi", "Anmitsu"],
  Kenyan: ["Irio", "Mutura", "Mishkaki", "Kuku paka", "Samaki wa kupaka", "Wali wa nazi", "Mbaazi wa nazi", "Matumbo", "Omena", "Kenyan beef stew", "Ndengu", "Viazi karai", "Mahamri", "Mkate wa sinia", "Kaimati", "Uji", "Pilau ya nyama", "Kienyeji chicken"],
  Malaysian: ["Asam laksa", "Hokkien mee", "Curry mee", "Wantan mee", "Bak kut teh", "Otak-otak", "Ikan bakar", "Sambal sotong", "Rendang tok", "Nasi kandar", "Nasi dagang", "Lontong", "Murtabak", "Apam balik", "Cendol", "Ais kacang", "Onde-onde", "Kuih lapis"],
  Mexican: ["Quesabirria", "Barbacoa", "Tacos de lengua", "Baja fish tacos", "Sopa seca", "Esquites", "Elote", "Tlacoyos", "Gorditas", "Sopes", "Huaraches", "Pambazo", "Cemitas", "Aguachile", "Mexican ceviche", "Chiles rellenos", "Mexican flan", "Tres leches cake"],
  Moroccan: ["Chicken tagine with preserved lemon", "Kefta tagine", "Seven-vegetable couscous", "Seffa medfouna", "Seafood pastilla", "Maakouda", "Briouats", "Batbout", "Harcha", "Moroccan khobz", "Taktouka", "Moroccan loubia", "Moroccan lentil soup", "Lamb mrouzia", "Sardine kefta balls", "Chebakia", "Sellou", "Sfenj"],
  Polish: ["Rosół", "Krupnik", "Chłodnik", "Pierogi ruskie", "Pyzy", "Kluski śląskie", "Łazanki", "Kaszanka", "Kielbasa stew", "Zrazy", "Polish gulasz", "Ryba po grecku", "Sałatka jarzynowa", "Racuchy", "Szarlotka", "Kremówka", "Piernik", "Babka wielkanocna"],
  Portuguese: ["Feijoada à transmontana", "Arroz de pato", "Arroz de polvo", "Açorda alentejana", "Migas à alentejana", "Carne de porco à alentejana", "Leitão da Bairrada", "Alheira", "Tripas à moda do Porto", "Prego no pão", "Amêijoas à Bulhão Pato", "Queijadas", "Bolo de bolacha", "Arroz doce", "Sonhos", "Bolo do caco", "Espetada madeirense", "Peixinhos da horta"],
  Russian: ["Russian borscht", "Okroshka", "Rassolnik", "Grechka kasha", "Kulebyaka", "Vinaigrette salad", "Herring under a fur coat", "Kholodets", "Pozharsky cutlets", "Russian kotleti", "Chebureki", "Tatar chak-chak", "Ptichye moloko", "Pryaniki", "Paskha", "Kurnik", "Oladyi", "Zapekanka"],
  Spanish: ["Fideuà", "Cocido madrileño", "Callos a la madrileña", "Arroz negro", "Calçots with romesco", "Escalivada", "Pan con tomate", "Salmorejo", "Ajoblanco", "Boquerones en vinagre", "Empanada gallega", "Gilda pintxo", "Coca de recapte", "Tarta de Santiago", "Ensaimada", "Torrijas", "Spanish flan", "Leche frita"],
  Thai: ["Red curry", "Panang curry", "Jungle curry", "Pad see ew", "Pad kee mao", "Rad na", "Khao pad", "Moo ping", "Gai yang", "Thai chicken satay", "Tod mun pla", "Hor mok", "Yam woon sen", "Nam tok", "Sai ua", "Khanom jeen nam ya", "Khanom krok", "Tub tim grob"],
  Tunisian: ["Tunisian shakshuka", "Bambalouni", "Tunisian mloukhia", "Osban", "Slata Tunisienne", "Harissa maison", "Tajine malsouka", "Tajine Tunisien", "Marka hloua", "Madfouna", "Nwasser", "Borzgane", "Zrir", "Assidat zgougou", "Kaak warka", "Broudou", "Tunisian fish couscous", "Mtabga"],
  Turkish: ["İskender kebab", "Döner kebab", "İzmir köfte", "Testi kebab", "Kuru fasulye", "Mercimek köftesi", "Biber dolması", "Yaprak sarma", "Ezogelin çorbası", "Tarhana çorbası", "Gözleme", "Simit", "Lokum", "Sütlaç", "Künefe", "Revani", "Aşure", "Lokma"],
  Ukrainian: ["Ukrainian kholodets", "Salo with rye bread", "Green borshch", "Yushka", "Kulish", "Zrazy", "Kruchenyky", "Buckwheat holubtsi", "Mlyntsi", "Hrechana kasha", "Paska", "Ukrainian babka", "Medivnyk", "Uzvar", "Korovai", "Poltava halushky", "Verhuny", "Kholodnyk"],
  Uruguayan: ["Milanesa napolitana", "Postre chajá", "Dulce de leche flan", "Uruguayan bizcochos", "Torta de fiambre", "Pizza a caballo", "Ñoquis del 29", "Puchero uruguayo", "Guiso de lentejas", "Guiso de mondongo", "Pastel de carne", "Empanadas criollas", "Chinchulines", "Morcilla a la parrilla", "Pamplona de pollo", "Dulce de membrillo", "Uruguayan alfajores", "Arroz con leche"],
  Vietnamese: ["Bánh canh", "Bún riêu", "Mì Quảng", "Cao lầu", "Bún thịt nướng", "Bún đậu mắm tôm", "Bánh bèo", "Bánh khọt", "Bánh chưng", "Bánh tét", "Gỏi gà", "Bò kho", "Canh chua", "Cơm gà Hội An", "Chè ba màu", "Cà phê trứng", "Bánh da lợn", "Bánh ít trần"],
  Indonesian: ["Nasi Padang", "Nasi uduk", "Nasi campur", "Mie goreng", "Bakso", "Sate Padang", "Gulai ayam", "Sayur lodeh", "Pecel", "Ketoprak", "Siomay Bandung", "Batagor", "Ayam betutu", "Ikan bakar", "Sambal goreng kentang", "Tempe orek", "Klepon", "Martabak manis"],
  Korean: ["Kimchi bokkeumbap", "Kimchi jeon", "Naengmyeon", "Jjajangmyeon", "Jjamppong", "Kalguksu", "Mandu", "Tteokguk", "Samgyetang", "Seolleongtang", "Galbitang", "Bossam", "Jokbal", "Gyeran jjim", "Dakgangjeong", "Hotteok", "Patbingsu", "Yakgwa"],
  Brazilian: ["Churrasco", "Pastel de feira", "Empadão", "Kibe brasileiro", "Tapioca crepe", "Arroz carreteiro", "Virado à paulista", "Tutu de feijão", "Galinhada", "Barreado", "Carne de sol", "Caldeirada brasileira", "Bolinho de bacalhau", "Cocada", "Pudim de leite", "Bolo de rolo", "Canjica", "Romeu e Julieta"],
};

const areaFlags: Record<string, string> = {
  American: "🇺🇸", British: "🇬🇧", Canadian: "🇨🇦", Chinese: "🇨🇳", Croatian: "🇭🇷", Dutch: "🇳🇱", Egyptian: "🇪🇬", Filipino: "🇵🇭",
  French: "🇫🇷", Greek: "🇬🇷", Indian: "🇮🇳", Irish: "🇮🇪", Italian: "🇮🇹", Jamaican: "🇯🇲", Japanese: "🇯🇵", Kenyan: "🇰🇪",
  Malaysian: "🇲🇾", Mexican: "🇲🇽", Moroccan: "🇲🇦", Polish: "🇵🇱", Portuguese: "🇵🇹", Russian: "🇷🇺", Spanish: "🇪🇸", Thai: "🇹🇭",
  Tunisian: "🇹🇳", Turkish: "🇹🇷", Ukrainian: "🇺🇦", Uruguayan: "🇺🇾", Vietnamese: "🇻🇳", Indonesian: "🇮🇩", Korean: "🇰🇷", Brazilian: "🇧🇷",
};

const specificSocialSources: Record<string, { platform: "YouTube" | "Reddit"; url: string }> = {
  "Croatian:Peka": { platform: "Reddit", url: "https://www.reddit.com/r/croatia/comments/ywgm4n/what_dishes_best_represent_the_cuisine_of_croatia/" },
  "Egyptian:Egyptian fattah": { platform: "Reddit", url: "https://www.reddit.com/r/Cooking/comments/huqj3p/every_week_i_cook_and_document_different_middle/" },
  "Filipino:Chicken adobo": { platform: "Reddit", url: "https://www.reddit.com/r/Philippines/comments/wlvo6q/looking_for_an_authentic_filipino_recipe_for_adobo/" },
  "Kenyan:Ugali": { platform: "YouTube", url: "https://www.youtube.com/watch?v=cdRLrX9CJKg" },
  "Tunisian:Lablabi": { platform: "Reddit", url: "https://www.reddit.com/r/Tunisia/comments/1h68b2w/tunisian_original_recipes/" },
  "Uruguayan:Chivito canadiense": { platform: "Reddit", url: "https://www.reddit.com/r/uruguay/comments/wl5zwy/looking_for_an_authentic_uruguayan_recipe_for/" },
};

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function inferCategory(name: string) {
  if (/cake|tart|pie|pudding|sweet|dessert|bars|baklava|brigadeiro|fritule|makroudh|quindim|pączki|sernik|tiramisu|churros/i.test(name)) return "Dessert";
  if (/soup|stew|chowder|borsh|shchi|harira|lablabi|laksa|tom yum|jjigae|čorbası|caldo|soto/i.test(name)) return "Soup & stew";
  if (/fish|shrimp|seafood|salmon|moqueca|ceviche|kinilaw|risotto nero|brudet|bacalhau|polvo/i.test(name)) return "Seafood";
  if (/bread|pancake|bannock|focaccia|msemen|baghrir|pide|roti|chapati|cornbread|pão/i.test(name)) return "Bread & baking";
  if (/rice|biryani|paella|pilau|nasi|bibimbap|risotto|cơm|jambalaya|baião/i.test(name)) return "Rice dish";
  return "Community recipe";
}

function sourceFor(area: string, dish: string, platform: "YouTube" | "Reddit") {
  const specific = specificSocialSources[`${area}:${dish}`];
  if (specific) return specific;
  const query = encodeURIComponent(`${dish} ${area} authentic recipe`);
  return platform === "YouTube"
    ? { platform, url: `https://www.youtube.com/results?search_query=${query}` }
    : { platform, url: `https://www.reddit.com/search/?q=${query}` };
}

export function createCommunityRecipeNote(area: string, dish: string, platform: "YouTube" | "Reddit" = "YouTube"): SocialRecipeSeed {
  const source = sourceFor(area, dish, platform);
  const category = inferCategory(dish);
  const flag = areaFlags[area] || "🌍";
  const media = foodImageFor(area, dish);
  return {
    id: `social-${slugify(area)}-${slugify(dish)}`,
    name: dish,
    area,
    category,
    image: media.image,
    imageVerified: media.verified,
    imageSubject: media.subject,
    source: `${source.platform} community research`,
    sourceUrl: source.url,
    platform: source.platform,
    social: true,
    taste: category === "Dessert" ? "Sweet & celebratory" : "Regional & home-style",
    texture: category === "Soup & stew" ? "Brothy / slow-cooked" : "Varies by household",
    origin: `${area} community kitchens`,
    flag,
    summary: `${dish} is preserved here as a concise ${area} community research note rather than a copied third-party recipe.`,
    researchPrompt: category === "Dessert"
      ? "Compare sweetness, dough or batter texture, serving occasion, and household finishing details."
      : category === "Soup & stew"
        ? "Compare the broth or sauce base, thickness, main aromatics, and customary accompaniments."
        : category === "Seafood"
          ? "Compare the local seafood, seasoning balance, cooking time, and regional serving style."
          : "Compare the core technique, defining ingredients, household substitutions, and regional serving context.",
    discussion: [
      {
        title: "Recurring community consensus",
        body: `Across the attributed ${source.platform} discussions, cooks consistently treat ${dish} as part of a specific ${area} cooking context rather than a generic recipe label. The defining ingredients and sequence matter more than decorative presentation.`,
      },
      {
        title: "Where versions differ",
        body: `Household versions vary in seasoning strength, available ingredients, equipment, and serving customs. Those differences are kept visible as adaptations instead of being presented as one universal or exclusively “authentic” formula.`,
      },
      {
        title: "Practical takeaway",
        body: category === "Dessert"
          ? "Pay close attention to sweetness, dough or batter texture, resting time, and the way the finished dish is served for celebrations or everyday meals."
          : category === "Soup & stew"
            ? "Compare the broth or sauce base, thickness, main aromatics, and customary accompaniments before choosing a version to cook."
            : category === "Seafood"
              ? "Use the freshest appropriate seafood available, then compare seasoning balance, heat control, cooking time, and regional serving style."
              : "Start with the core technique and defining ingredients, then document any household substitution so readers can understand what changed and why.",
      },
    ],
    searchText: `${dish} ${area} ${category} ${source.platform} community note recipe traditional household regional`.toLowerCase(),
  };
}

export function buildSocialRecipePool() {
  return Object.entries(regionalDishes).flatMap(([area, coreDishes]) => {
    const dishes = Array.from(new Set([...coreDishes, ...(regionalDishExtras[area] ?? [])]));
    return dishes.map((dish, dishIndex) => createCommunityRecipeNote(area, dish, dishIndex % 2 === 0 ? "YouTube" : "Reddit"));
  });
}

export const balancedCuisineAreas = Object.keys(regionalDishes);
export const socialRecipePool = buildSocialRecipePool();

export function getSocialRecipeById(id: string) {
  return socialRecipePool.find((note) => note.id === id);
}

function normalizeRecipeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function findSocialRecipe(area: string, dishName: string) {
  const normalized = normalizeRecipeName(dishName);
  return socialRecipePool.find((note) => note.area === area && normalizeRecipeName(note.name) === normalized);
}
