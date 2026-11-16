// Pantry matching across the whole published catalogue ("Cook with what you have").
// Each ingredient line is read as one kitchen ingredient (a concept); concepts that share a
// `group` can stand in for each other and are shown as swaps, never as silent matches.
// Self-contained (no imports) so tests can load the file directly.

export type PantryLocale = "en" | "zh" | "ja" | "fr" | "it" | "es";
export type Concept = { id: string; group?: string; basic?: boolean; label: Record<PantryLocale, string>; words: readonly string[] };

const concepts: Concept[] = [];
/** id, labels (en zh ja fr it es), extra words ("|"-separated), interchangeable group, assumed basic. */
function c(id: string, en: string, zh: string, ja: string, fr: string, it: string, es: string, extra = "", group?: string, basic?: boolean) {
  const label = { en, zh, ja, fr, it, es };
  concepts.push({ id, group, basic, label, words: [en, zh, ja, fr, it, es, ...extra.split("|")].filter(Boolean) });
}

// Assumed in every kitchen: never counted as missing.
c("water", "water", "水", "水", "eau", "acqua", "agua", "warm water|cold water|hot water|boiling water|cooking water|drinking water|清水|温水|开水|热水|お湯|ぬるま湯", undefined, true);
c("ice", "ice", "冰块", "氷", "glaçons", "ghiaccio", "hielo", "ice cubes|crushed ice|冰|glacon|glacons", undefined, true);
c("salt", "salt", "盐", "塩", "sel", "sale", "sal", "sea salt|kosher salt|fine salt|table salt|食盐|sel fin|sale fino", undefined, true);
c("black-pepper", "black pepper", "黑胡椒", "黒こしょう", "poivre", "pepe", "pimienta", "pepper|ground pepper|white pepper|peppercorns|black peppercorns|胡椒|白胡椒|胡椒粉|こしょう|コショウ|poivre noir|pepe nero|pimienta negra", undefined, true);

// Fats and oils
c("olive-oil", "olive oil", "橄榄油", "オリーブオイル", "huile d’olive", "olio d’oliva", "aceite de oliva", "extra virgin olive oil|light olive oil|olio extravergine|olio extravergine di oliva", "oil");
c("cooking-oil", "cooking oil", "食用油", "サラダ油", "huile végétale", "olio di semi", "aceite vegetal", "oil|vegetable oil|sunflower oil|canola oil|rapeseed oil|neutral oil|neutral cooking oil|frying oil|corn oil|peanut oil|groundnut oil|ground nut oil|coconut oil|cooking spray|nonstick cooking spray|植物油|花生油|菜籽油|玉米油|油|食油|huile|huile de tournesol|olio|olio di semi di girasole|aceite|aceite de girasol", "oil");
c("sesame-oil", "sesame oil", "香油", "ごま油", "huile de sésame", "olio di sesamo", "aceite de sésamo", "sesame seed oil|toasted sesame oil|芝麻油|麻油");
c("butter", "butter", "黄油", "バター", "beurre", "burro", "mantequilla", "unsalted butter|salted butter|melted butter|softened butter|牛油|beurre doux|beurre demi sel", "butter");
c("margarine", "margarine", "人造黄油", "マーガリン", "margarine", "margarina", "margarina", "", "butter");
c("ghee", "ghee", "酥油", "ギー", "ghee", "ghee", "ghee", "clarified butter|beurre clarifié|burro chiarificato", "butter");
c("lard", "lard", "猪油", "ラード", "saindoux", "strutto", "manteca de cerdo", "pork fat|suet|shortening|vegetable shortening");

// Dairy and eggs
c("egg", "eggs", "鸡蛋", "卵", "œufs", "uova", "huevos", "egg|large eggs|egg yolk|egg yolks|egg white|egg whites|蛋|蛋黄|蛋清|蛋白|たまご|玉子|卵黄|卵白|oeuf|oeufs|œuf|uovo|tuorlo|tuorli|albume|huevo|yema|yemas|clara|claras");
c("century-egg", "century eggs", "皮蛋", "ピータン", "œufs de cent ans", "uova centenarie", "huevos centenarios", "century egg|preserved egg|preserved eggs|松花蛋");
c("milk", "milk", "牛奶", "牛乳", "lait", "latte", "leche", "whole milk|skim milk|skimmed milk|semi skimmed milk|warm milk|奶|ミルク|lait entier|latte intero|leche entera", "milk");
c("plant-milk", "plant milk", "植物奶", "植物性ミルク", "lait végétal", "latte vegetale", "leche vegetal", "almond milk|soy milk|soya milk|oat milk|rice milk|豆浆|燕麦奶|杏仁奶|豆乳|オーツミルク|lait damande|lait davoine|latte di mandorla|latte di soia|bebida de avena|leche de almendras", "milk");
c("cream", "cream", "淡奶油", "生クリーム", "crème liquide", "panna", "nata", "creme|crème|double cream|heavy cream|whipping cream|single cream|light cream|thickened cream|稀奶油|鲜奶油|奶油|crème fleurette|panna da cucina|panna fresca|panna liquida|nata para montar|crema de leche");
c("sour-cream", "sour cream", "酸奶油", "サワークリーム", "crème fraîche", "panna acida", "crema agria", "creme fraiche|crème fraîche épaisse", "cultured");
c("yogurt", "yogurt", "酸奶", "ヨーグルト", "yaourt", "yogurt", "yogur", "yoghurt|greek yogurt|plain yogurt|natural yogurt|greek yoghurt|yogourt|yaourt grec|yogurt greco|yogur griego|酸乳", "cultured");
c("buttermilk", "buttermilk", "酪乳", "バターミルク", "babeurre", "latticello", "suero de leche", "");
c("condensed-milk", "condensed milk", "炼乳", "練乳", "lait concentré sucré", "latte condensato", "leche condensada", "sweetened condensed milk");
c("evaporated-milk", "evaporated milk", "淡炼乳", "エバミルク", "lait concentré non sucré", "latte evaporato", "leche evaporada", "fat free evaporated milk");
c("parmesan", "Parmesan", "帕玛森奶酪", "パルメザンチーズ", "parmesan", "parmigiano", "parmesano", "parmesan cheese|grated parmesan|grated parmesan cheese|grana padano|parmigiano reggiano|帕马森|帕玛森|パルミジャーノ", "hard-cheese");
c("pecorino", "pecorino", "佩科里诺奶酪", "ペコリーノ", "pecorino", "pecorino", "pecorino", "pecorino romano|grated pecorino", "hard-cheese");
c("cheese", "cheese", "奶酪", "チーズ", "fromage", "formaggio", "queso", "cheddar|cheddar cheese|swiss cheese|gruyere|gruyère|emmental|comte|comté|comte cheese|monterey jack|edam|gouda|goats cheese|goat cheese|blue cheese|low fat cheddar cheese|芝士|起司|切达|切达奶酪|チェダー|fromage râpé|queso rallado", "melting-cheese");
c("mozzarella", "mozzarella", "马苏里拉奶酪", "モッツァレラ", "mozzarella", "mozzarella", "mozzarella", "low moisture mozzarella|fresh mozzarella|buffalo mozzarella|马苏里拉|モッツァレラチーズ", "melting-cheese");
c("feta", "feta", "菲达奶酪", "フェタチーズ", "feta", "feta", "queso feta", "feta cheese|halloumi|queso fresco|羊奶酪");
c("cream-cheese", "cream cheese", "奶油奶酪", "クリームチーズ", "fromage frais", "formaggio spalmabile", "queso crema", "philadelphia|奶油芝士|奶酪芝士", "soft-cheese");
c("mascarpone", "mascarpone", "马斯卡彭奶酪", "マスカルポーネ", "mascarpone", "mascarpone", "mascarpone", "马斯卡彭", "soft-cheese");
c("ricotta", "ricotta", "意式乳清奶酪", "リコッタ", "ricotta", "ricotta", "ricotta", "ricotta cheese|cottage cheese|リコッタチーズ", "soft-cheese");

// Meat, fish and tofu
c("chicken", "chicken", "鸡肉", "鶏肉", "poulet", "pollo", "pollo", "chicken breast|chicken breasts|chicken thigh|chicken thighs|chicken wings|chicken legs|chicken drumsticks|whole chicken|ground chicken|boneless skinless chicken breast|鸡|鸡胸肉|鸡腿|鸡翅|鸡腿肉|チキン|鶏むね肉|鶏もも肉|手羽先|blanc de poulet|cuisses de poulet|petto di pollo|cosce di pollo|pechuga de pollo|muslos de pollo", "poultry");
c("turkey", "turkey", "火鸡", "七面鳥", "dinde", "tacchino", "pavo", "turkey breast|ground turkey|火鸡肉", "poultry");
c("duck", "duck", "鸭肉", "鴨肉", "canard", "anatra", "pato", "duck breast|duck breasts|duck legs|鸭|鴨|magret|magret de canard");
c("beef", "beef", "牛肉", "牛肉", "bœuf", "manzo", "ternera", "ground beef|minced beef|beef mince|steak|steaks|sirloin steak|rump steak|beef brisket|brisket|beef fillet|stewing beef|braising steak|chuck|corned beef|oxtail|veal|牛|牛腩|肥牛|牛里脊|ビーフ|牛ひき肉|牛すじ|boeuf|viande hachée|steak haché|veau|carne macinata|vitello|carne de res|carne picada|res");
c("pork", "pork", "猪肉", "豚肉", "porc", "maiale", "cerdo", "ground pork|minced pork|pork mince|pork belly|pork shoulder|pork chops|pork ribs|spare ribs|spareribs|pork loin|pork tenderloin|五花肉|排骨|猪排|猪里脊|肉末|肉馅|猪肉馅|豚バラ|豚ひき肉|豚こま|ポーク|poitrine de porc|côtes de porc|carne di maiale|costine|lonza|panceta fresca|costillas de cerdo|lomo de cerdo");
c("lamb", "lamb", "羊肉", "ラム肉", "agneau", "agnello", "cordero", "lamb mince|ground lamb|leg of lamb|lamb leg|lamb shoulder|lamb chops|lamb loin chops|mutton|ラム|マトン|羊|羊排|gigot|mouton|cosciotto dagnello|pierna de cordero");
c("bacon", "bacon", "培根", "ベーコン", "lardons", "pancetta", "beicon", "streaky bacon|smoked bacon|bacon rashers|guanciale|bacon lardons|lardon|tocino|bacón|panceta");
c("ham", "ham", "火腿", "ハム", "jambon", "prosciutto", "jamón", "jamon|jamón ibérico|jamon iberico|jamón serrano|prosciutto crudo|prosciutto cotto|serrano ham|parma ham|cooked ham|jambon cru|jambon blanc|金华火腿");
c("sausage", "sausages", "香肠", "ソーセージ", "saucisses", "salsiccia", "salchichas", "sausage|pork sausages|hot dogs|frankfurters|腊肠|ウインナー|saucisse|salsicce|salchicha");
c("chorizo", "chorizo", "西班牙辣肠", "チョリソー", "chorizo", "chorizo", "chorizo", "chorizo sausage|cooking chorizo", "cured-sausage");
c("salami", "salami", "萨拉米", "サラミ", "saucisson sec", "salame", "salchichón", "pepperoni|saucisson|salame piccante|fuet", "cured-sausage");
c("luncheon-meat", "luncheon meat", "午餐肉", "ランチョンミート", "viande en conserve", "carne in scatola", "carne enlatada", "spam|canned ham|スパム");
c("white-fish", "white fish", "白肉鱼", "白身魚", "poisson blanc", "pesce bianco", "pescado blanco", "fish|fish fillets|cod|haddock|smoked haddock|hake|pollock|tilapia|sea bass|sea bream|salt cod|halibut|basa|catfish|鱼|鱼片|鱼肉|鳕鱼|鲈鱼|龙利鱼|草鱼|鲫鱼|魚|タラ|鯛|cabillaud|merlu|poisson|pesce|merluzzo|baccalà|branzino|orata|bacalao|merluza|pescado|lubina", "white-fish");
c("salmon", "salmon", "三文鱼", "鮭", "saumon", "salmone", "salmón", "salmon fillet|salmon fillets|smoked salmon|鲑鱼|サーモン|さけ");
c("tuna", "tuna", "金枪鱼", "ツナ", "thon", "tonno", "atún", "tinned tuna|canned tuna|tuna steak|まぐろ|マグロ|ツナ缶");
c("anchovy", "anchovies", "凤尾鱼", "アンチョビ", "anchois", "acciughe", "anchoas", "anchovy|anchovy fillets|dried anchovies|鳀鱼|小鱼干|alici|boquerones");
c("shrimp", "prawns", "虾", "えび", "crevettes", "gamberi", "gambas", "prawn|shrimp|shrimps|king prawns|tiger prawns|raw king prawns|虾仁|大虾|鲜虾|海老|エビ|むきえび|crevette|gamberetti|gambero|mazzancolle|camarones|camarón|langostinos");
c("squid", "squid", "鱿鱼", "イカ", "calamar", "calamari", "calamar", "cleaned squid|calamari rings|墨鱼|いか|encornet|seppie|chipirones|sepia");
c("octopus", "octopus", "章鱼", "タコ", "poulpe", "polpo", "pulpo", "八爪鱼|たこ");
c("clams", "clams", "蛤蜊", "あさり", "palourdes", "vongole", "almejas", "clam|花蛤|蚬子|アサリ|coques", "shellfish");
c("mussels", "mussels", "青口", "ムール貝", "moules", "cozze", "mejillones", "mussel|贻贝|淡菜", "shellfish");
c("scallops", "scallops", "扇贝", "ホタテ", "coquilles Saint-Jacques", "capesante", "vieiras", "scallop|干贝|帆立|noix de saint jacques");
c("crab", "crab", "螃蟹", "カニ", "crabe", "granchio", "cangrejo", "crab meat|crabmeat|蟹|蟹肉|かに|surimi|crab sticks|蟹棒|カニカマ");
c("tofu", "tofu", "豆腐", "豆腐", "tofu", "tofu", "tofu", "firm tofu|silken tofu|soft tofu|extra firm tofu|嫩豆腐|老豆腐|北豆腐|南豆腐|内酯豆腐|絹ごし豆腐|木綿豆腐");
c("fried-tofu", "fried tofu", "油豆腐", "油揚げ", "tofu frit", "tofu fritto", "tofu frito", "abura age|abura age fried tofu|tofu puffs|豆泡|厚揚げ|あぶらあげ");
c("dried-tofu", "dried tofu", "豆干", "押し豆腐", "tofu séché", "tofu essiccato", "tofu seco", "pressed tofu|豆腐干|香干|tofu skin|bean curd sheets|千张|豆腐皮|腐竹|湯葉|ゆば");

// Vegetables
c("onion", "onion", "洋葱", "玉ねぎ", "oignon", "cipolla", "cebolla", "onions|red onion|red onions|white onion|yellow onion|brown onion|medium onion|medium onions|large onion|large onions|small onion|chopped onion|葱头|紫洋葱|たまねぎ|タマネギ|新玉ねぎ|oignons|oignon rouge|cipolle|cipolla rossa|cebollas|cebolla morada", "onion");
c("shallot", "shallots", "红葱头", "エシャロット", "échalotes", "scalogno", "chalotas", "shallot|challots|banana shallots|echalote|échalote|scalogni|chalota|干葱头", "onion");
c("leek", "leeks", "韭葱", "リーキ", "poireaux", "porri", "puerros", "leek|poireau|porro|puerro|ポロねぎ", "onion");
c("onion-powder", "onion powder", "洋葱粉", "オニオンパウダー", "oignon en poudre", "cipolla in polvere", "cebolla en polvo", "granulated onion|dried onion|onion flakes", "onion");
c("scallion", "spring onions", "葱", "ねぎ", "oignons verts", "cipollotti", "cebolletas", "scallion|scallions|spring onion|green onion|green onions|large green onion|large scallion|japanese leek|小葱|大葱|香葱|葱花|葱白|葱段|ネギ|長ねぎ|長ネギ|青ねぎ|万能ねぎ|小ねぎ|cebette|oignon vert|cipollotto|cebolleta|cebolla de verdeo", "green-onion");
c("chives", "chives", "细香葱", "チャイブ", "ciboulette", "erba cipollina", "cebollino", "chive|fresh chives|cive", "green-onion");
c("chinese-chives", "Chinese chives", "韭菜", "ニラ", "ciboulette chinoise", "erba cipollina cinese", "cebollino chino", "garlic chives|chinese leek|韭黄|韭菜花|にら");
c("garlic", "garlic", "大蒜", "にんにく", "ail", "aglio", "ajo", "garlic clove|garlic cloves|cloves garlic|clove garlic|cloves of garlic|minced garlic|garlic paste|crushed garlic|蒜|蒜末|蒜头|蒜瓣|蒜蓉|ニンニク|おろしにんにく|gousse dail|gousses dail|spicchio daglio|spicchi daglio|diente de ajo|dientes de ajo", "garlic");
c("garlic-powder", "garlic powder", "蒜粉", "ガーリックパウダー", "ail en poudre", "aglio in polvere", "ajo en polvo", "granulated garlic|garlic granules|garlic salt", "garlic");
c("ginger", "ginger", "姜", "しょうが", "gingembre", "zenzero", "jengibre", "fresh ginger|ginger root|minced ginger|ginger paste|grated ginger|生姜|姜片|姜末|姜丝|老姜|ショウガ|おろし生姜|gingembre frais|zenzero fresco", "ginger");
c("ground-ginger", "ground ginger", "姜粉", "ジンジャーパウダー", "gingembre en poudre", "zenzero in polvere", "jengibre molido", "ginger powder|dried ginger", "ginger");
c("galangal", "galangal", "南姜", "ガランガル", "galanga", "galanga", "galanga", "galangal root|高良姜", "ginger");
c("carrot", "carrots", "胡萝卜", "にんじん", "carottes", "carote", "zanahorias", "carrot|人参|ニンジン|carotte|carota|zanahoria");
c("celery", "celery", "芹菜", "セロリ", "céleri", "sedano", "apio", "celery stalks|celery sticks|celery stick|celery stalk|西芹|香芹|celeri|céleri branche|coste di sedano");
c("potato", "potatoes", "土豆", "じゃがいも", "pommes de terre", "patate", "patatas", "potato|new potatoes|floury potatoes|red potatoes|russet potato|russet potatoes|small potatoes|medium potatoes|large potatoes|waxy potatoes|baby potatoes|马铃薯|洋芋|ジャガイモ|pomme de terre|patata|papa|papas");
c("sweet-potato", "sweet potatoes", "红薯", "さつまいも", "patates douces", "patate dolci", "boniatos", "sweet potato|yam|yams|地瓜|番薯|紫薯|サツマイモ|patate douce|patata dolce|batata|boniato|camote");
c("tomato", "tomatoes", "番茄", "トマト", "tomates", "pomodori", "tomates", "tomato|cherry tomatoes|plum tomatoes|chopped tomatoes|tinned tomatoes|tinned tomatos|canned tomatoes|tinned chopped tomatoes|diced tomatoes|crushed tomatoes|peeled tomatoes|no salt added diced tomatoes|medium tomatoes|vine tomatoes|beef tomato|西红柿|小番茄|圣女果|番茄罐头|ミニトマト|トマト缶|tomate|tomates concassées|pomodoro|pomodorini|pelati|pomodori pelati|jitomate|jitomates|tomate triturado", "tomato");
c("passata", "passata", "番茄酱汁", "トマトソース", "coulis de tomate", "passata di pomodoro", "salsa de tomate", "tomato sauce|tomato pizza sauce|pizza sauce|marinara|marinara sauce|sugo|sauce tomate|tomate frito", "tomato");
c("tomato-paste", "tomato paste", "番茄膏", "トマトペースト", "concentré de tomate", "concentrato di pomodoro", "concentrado de tomate", "tomato puree|tomato purée|double concentrate|番茄酱|番茄沙司酱|pasta de tomate|doppio concentrato");
c("cucumber", "cucumber", "黄瓜", "きゅうり", "concombre", "cetriolo", "pepino", "cucumbers|english cucumber|小黄瓜|キュウリ|concombres|cetrioli|pepinos");
c("zucchini", "courgettes", "西葫芦", "ズッキーニ", "courgettes", "zucchine", "calabacines", "zucchini|courgette|zucchina|calabacin|calabacín");
c("eggplant", "aubergine", "茄子", "なす", "aubergine", "melanzana", "berenjena", "eggplant|eggplants|aubergines|egg plants|egg plant|ナス|melanzane|berenjenas");
c("bell-pepper", "peppers", "甜椒", "パプリカ", "poivron", "peperone", "pimiento", "bell pepper|bell peppers|red pepper|red peppers|green pepper|green peppers|yellow pepper|yellow peppers|orange pepper|red bell pepper|green bell pepper|yellow bell pepper|capsicum|sweet pepper|sweet peppers|roasted red peppers|jarred roasted red peppers|彩椒|青椒|灯笼椒|ピーマン|赤ピーマン|poivron rouge|poivron vert|poivrons|peperoni|pimientos|pimiento rojo|pimiento verde|morrón");
c("chili", "chillies", "辣椒", "唐辛子", "piment", "peperoncino", "chile", "chili|chilli|chile|chilies|chiles|chile pepper|chile peppers|fresh red chile|red chilli|green chilli|red chili|green chili|red chillies|green chillies|fresh green chile|jalapeno|jalapeño|jalapeno pepper|jalapeño pepper|fresh jalapeño pepper|scotch bonnet|scotch bonnet pepper|birds eye chillies|birds eye chili|small hot chilies|thai chili|thai chillies|serrano|serrano chile|chili pepper|chilli pepper|hot pepper|小米辣|尖椒|青辣椒|红辣椒|二荆条|青唐辛子|piments|piment frais|peperoncini|peperoncino fresco|guindilla|chiles frescos", "chili");
c("dried-chili", "dried chili", "干辣椒", "一味唐辛子", "piment séché", "peperoncino secco", "chile seco", "chili powder|chilli powder|chile powder|cayenne|cayenne pepper|ground cayenne pepper|red pepper flakes|chilli flakes|chili flakes|crushed red pepper|gochugaru|dried chilies|dried chillies|dried chiles|dried red chillies|kashmiri chilli powder|ancho chile|chipotle|辣椒粉|辣椒面|辣椒碎|干辣椒段|粉唐辛子|鷹の爪|輪切り唐辛子|piment de cayenne|piment en poudre|piment despelette|peperoncino in polvere|guindilla seca|cayena|chile en polvo", "chili");
c("cabbage", "cabbage", "白菜", "キャベツ", "chou", "cavolo", "repollo", "white cabbage|red cabbage|savoy cabbage|napa cabbage|chinese cabbage|baby napa cabbage|green cabbage|pointed cabbage|卷心菜|包菜|圆白菜|大白菜|娃娃菜|紫甘蓝|ハクサイ|白菜|chou blanc|chou rouge|chou chinois|cavolo cappuccio|verza|col|lombarda|col china");
c("bok-choy", "bok choy", "青菜", "チンゲン菜", "pak-choï", "pak choi", "bok choy", "pak choi|pak choy|baby bok choy|choy sum|小白菜|上海青|油菜|菜心|小油菜|pak choï|青梗菜|小松菜", "greens");
c("spinach", "spinach", "菠菜", "ほうれん草", "épinards", "spinaci", "espinacas", "baby spinach|leaf spinach|epinards|ホウレンソウ|espinaca", "greens");
c("kale", "kale", "羽衣甘蓝", "ケール", "chou kale", "cavolo riccio", "col rizada", "cavolo nero|lacinato kale|curly kale|kale leaves", "greens");
c("chard", "chard", "瑞士甜菜", "フダンソウ", "blettes", "bietole", "acelgas", "swiss chard|rainbow chard|collard greens|blette|bietola|acelga", "greens");
c("lettuce", "salad leaves", "生菜", "レタス", "salade", "insalata", "lechuga", "lettuce|romaine|romaine lettuce|iceberg lettuce|little gem|butter lettuce|mixed greens|mixed salad leaves|salad greens|球生菜|サラダ菜|laitue|lattuga|lechuga romana", "salad");
c("rocket", "rocket", "芝麻菜", "ルッコラ", "roquette", "rucola", "rúcula", "arugula|watercress|西洋菜|豆瓣菜|クレソン|cresson|crescione|berros", "salad");
c("broccoli", "broccoli", "西兰花", "ブロッコリー", "brocoli", "broccoli", "brócoli", "broccoli florets|tenderstem broccoli|西蓝花|青花菜|brocolis", "brassica");
c("cauliflower", "cauliflower", "花菜", "カリフラワー", "chou-fleur", "cavolfiore", "coliflor", "菜花|花椰菜|chou fleur", "brassica");
c("mushroom", "mushrooms", "蘑菇", "きのこ", "champignons", "funghi", "champiñones", "mushroom|button mushrooms|chestnut mushrooms|cremini mushrooms|shiitake|shiitake mushrooms|dried shiitake mushrooms|enoki|enoki mushrooms|oyster mushrooms|king oyster mushrooms|porcini|dried porcini mushrooms|wood ear|wood ear mushrooms|香菇|干香菇|金针菇|平菇|杏鲍菇|口蘑|木耳|黑木耳|しいたけ|干し椎茸|しめじ|えのき|まいたけ|エリンギ|キノコ|champignon|champignons de paris|cèpes|fungo|funghi porcini|setas|hongos");
c("peas", "peas", "豌豆", "グリーンピース", "petits pois", "piselli", "guisantes", "frozen peas|garden peas|green peas|snow peas|sugar snap peas|mangetout|青豆|荷兰豆|甜豆|えんどう|絹さや|pois|pois gourmands|chícharos|tirabeques");
c("green-beans", "green beans", "四季豆", "いんげん", "haricots verts", "fagiolini", "judías verdes", "string beans|french beans|runner beans|long beans|豆角|扁豆角|长豆角|インゲン|さやいんげん|ejotes");
c("corn", "sweetcorn", "玉米", "とうもろこし", "maïs", "mais", "maíz", "corn|sweet corn|corn on the cob|corn kernels|baby corn|玉米粒|コーン|elote|choclo");
c("pumpkin", "pumpkin", "南瓜", "かぼちゃ", "potiron", "zucca", "calabaza", "squash|butternut squash|butternut|kabocha|courge|courge butternut|citrouille|カボチャ|zapallo");
c("beetroot", "beetroot", "甜菜根", "ビーツ", "betterave", "barbabietola", "remolacha", "beet|beets|small beets|betteraves|barbabietole");
c("radish", "radish", "萝卜", "大根", "radis", "ravanello", "rábano", "radishes|daikon|white radish|daikon radish|白萝卜|红萝卜|ラディッシュ|ravanelli|rabanos|rábanos");
c("turnip", "turnip", "芜菁", "かぶ", "navet", "rapa", "nabo", "turnips|swede|rutabaga|カブ|navets|rape|nabos");
c("asparagus", "asparagus", "芦笋", "アスパラガス", "asperges", "asparagi", "espárragos", "asparagus spears|green asparagus|asperge|asparago|esparrago");
c("avocado", "avocado", "牛油果", "アボカド", "avocat", "avocado", "aguacate", "avocados|鳄梨|avocats|aguacates|palta");
c("bean-sprouts", "bean sprouts", "豆芽", "もやし", "germes de soja", "germogli di soia", "brotes de soja", "beansprouts|soybean sprouts|mung bean sprouts|绿豆芽|黄豆芽|モヤシ|pousses de soja");
c("fennel", "fennel", "茴香头", "フェンネル", "fenouil", "finocchio", "hinojo", "fennel bulb|球茎茴香");
c("okra", "okra", "秋葵", "オクラ", "gombo", "okra", "quimbombó", "ladies fingers|gombos");
c("artichoke", "artichokes", "洋蓟", "アーティチョーク", "artichauts", "carciofi", "alcachofas", "artichoke|artichoke hearts|朝鲜蓟|artichaut|carciofo|alcachofa");
c("lemongrass", "lemongrass", "香茅", "レモングラス", "citronnelle", "citronella", "hierba limón", "lemongrass stalks|lemongrass stalk|lemon grass|香茅草|limoncillo");
c("lime-leaf", "lime leaves", "柠檬叶", "こぶみかんの葉", "feuilles de combava", "foglie di lime", "hojas de lima", "makrut lime leaves|kaffir lime leaves|lime leaf|makrut lime leaf|泰国青柠叶|バイマックルー");
c("curry-leaves", "curry leaves", "咖喱叶", "カレーリーフ", "feuilles de curry", "foglie di curry", "hojas de curry", "curry leaf");
c("taro", "taro", "芋头", "里芋", "taro", "taro", "malanga", "taro root|芋艿|さといも|サトイモ");
c("burdock", "burdock root", "牛蒡", "ごぼう", "bardane", "bardana", "bardana", "burdock|ゴボウ");
c("lotus-root", "lotus root", "莲藕", "れんこん", "racine de lotus", "radice di loto", "raíz de loto", "藕|レンコン");
c("bamboo-shoots", "bamboo shoots", "竹笋", "たけのこ", "pousses de bambou", "germogli di bambù", "brotes de bambú", "bamboo shoot|笋|冬笋|春笋|タケノコ");
c("seaweed", "seaweed", "海带", "昆布", "algues", "alghe", "algas", "kombu|dried kombu|kelp|nori|nori sheets|wakame|hijiki|紫菜|海苔|裙带菜|わかめ|のり|ひじき");

// Herbs
c("parsley", "parsley", "欧芹", "パセリ", "persil", "prezzemolo", "perejil", "flat leaf parsley|fresh parsley|chopped parsley|italian parsley|curly parsley|洋香菜|persil plat");
c("cilantro", "coriander", "香菜", "パクチー", "coriandre", "coriandolo", "cilantro", "fresh coriander|coriander leaves|coriander leaf|cilantro leaves|fresh cilantro|chopped cilantro|芫荽|シャンツァイ|coriandre fraîche|coriandolo fresco");
c("basil", "basil", "罗勒", "バジル", "basilic", "basilico", "albahaca", "basil leaves|fresh basil|dried basil|thai basil|holy basil|九层塔|バジリコ");
c("mint", "mint", "薄荷", "ミント", "menthe", "menta", "menta", "mint leaves|fresh mint|dried mint|chopped fresh mint|spearmint|薄荷叶|hierbabuena");
c("dill", "dill", "莳萝", "ディル", "aneth", "aneto", "eneldo", "fresh dill|dill weed");
c("thyme", "thyme", "百里香", "タイム", "thym", "timo", "tomillo", "fresh thyme|dried thyme|thyme sprigs|thyme leaves", "dried-herb");
c("rosemary", "rosemary", "迷迭香", "ローズマリー", "romarin", "rosmarino", "romero", "fresh rosemary|rosemary sprigs|dried rosemary", "dried-herb");
c("oregano", "oregano", "牛至", "オレガノ", "origan", "origano", "orégano", "dried oregano|fresh oregano|mexican oregano", "dried-herb");
c("marjoram", "marjoram", "马郁兰", "マジョラム", "marjolaine", "maggiorana", "mejorana", "dried marjoram", "dried-herb");
c("mixed-herbs", "mixed herbs", "混合香草", "ミックスハーブ", "herbes de Provence", "erbe aromatiche miste", "hierbas provenzales", "dried mixed herbs|italian seasoning|herbes de provence|bouquet garni|fines herbes", "dried-herb");
c("sage", "sage", "鼠尾草", "セージ", "sauge", "salvia", "salvia", "dried sage|sage leaves|fresh sage", "dried-herb");
c("tarragon", "tarragon", "龙蒿", "タラゴン", "estragon", "dragoncello", "estragón", "fresh tarragon|dried tarragon");
c("bay-leaf", "bay leaves", "香叶", "ローリエ", "laurier", "alloro", "laurel", "bay leaf|dried bay leaves|月桂叶|ローレル|feuille de laurier|feuilles de laurier|foglie di alloro|hoja de laurel|hojas de laurel");

// Spices
c("cumin", "cumin", "孜然", "クミン", "cumin", "cumino", "comino", "ground cumin|cumin seeds|cumin seed|孜然粉|クミンシード|cumin en poudre|comino molido");
c("ground-coriander", "ground coriander", "芫荽籽粉", "コリアンダーパウダー", "coriandre moulue", "coriandolo in polvere", "cilantro molido", "coriander powder|coriander seeds|coriander seed|ground coriander seed|graines de coriandre");
c("paprika", "paprika", "红椒粉", "パプリカパウダー", "paprika", "paprica", "pimentón", "smoked paprika|sweet paprika|hot paprika|pimenton|pimentón de la vera|烟熏红椒粉");
c("turmeric", "turmeric", "姜黄粉", "ターメリック", "curcuma", "curcuma", "cúrcuma", "ground turmeric|turmeric powder|姜黄|ウコン");
c("cinnamon", "cinnamon", "肉桂", "シナモン", "cannelle", "cannella", "canela", "ground cinnamon|cinnamon stick|cinnamon sticks|cassia|cassia bark|桂皮|肉桂粉|シナモンスティック|baton de cannelle|bâton de cannelle|stecca di cannella|rama de canela");
c("nutmeg", "nutmeg", "肉豆蔻", "ナツメグ", "muscade", "noce moscata", "nuez moscada", "ground nutmeg|grated nutmeg|noix de muscade|mace");
c("clove", "cloves", "丁香", "クローブ", "clous de girofle", "chiodi di garofano", "clavos", "whole cloves|ground cloves|clove|clou de girofle|clavo de olor|clavos de olor");
c("allspice", "allspice", "多香果", "オールスパイス", "piment de la Jamaïque", "pimento", "pimienta de Jamaica", "ground allspice|mixed spice|pumpkin spice|pimienta gorda");
c("cardamom", "cardamom", "豆蔻", "カルダモン", "cardamome", "cardamomo", "cardamomo", "ground cardamom|ground cardomom|cardamom pods|green cardamom|小豆蔻");
c("star-anise", "star anise", "八角", "八角", "anis étoilé", "anice stellato", "anís estrellado", "大料|スターアニス|badiane");
c("five-spice", "five-spice powder", "五香粉", "五香粉", "cinq-épices", "cinque spezie", "cinco especias", "five spice|chinese five spice|five spice powder|十三香|cinq épices");
c("garam-masala", "garam masala", "印度什香粉", "ガラムマサラ", "garam masala", "garam masala", "garam masala", "", "curry-spice");
c("curry-powder", "curry powder", "咖喱粉", "カレー粉", "curry en poudre", "curry in polvere", "curry en polvo", "curry|madras curry powder|咖喱|カレー|curry block|curry roux|カレールー|咖喱块", "curry-spice");
c("sichuan-pepper", "Sichuan peppercorns", "花椒", "花椒", "poivre du Sichuan", "pepe di Sichuan", "pimienta de Sichuan", "sichuan pepper|sichuan peppercorns|szechuan pepper|szechuan peppercorns|花椒粉|麻椒|山椒");
c("saffron", "saffron", "藏红花", "サフラン", "safran", "zafferano", "azafrán", "saffron threads|番红花|pistils de safran|hebras de azafrán");
c("fennel-seed", "fennel seeds", "小茴香", "フェンネルシード", "graines de fenouil", "semi di finocchio", "semillas de hinojo", "fennel seed|anise seeds|anise seed|aniseed|茴香籽|anis vert");
c("mustard-seed", "mustard seeds", "芥菜籽", "マスタードシード", "graines de moutarde", "semi di senape", "semillas de mostaza", "mustard seed|black mustard seeds|yellow mustard seeds");
c("caraway", "caraway seeds", "葛缕子", "キャラウェイ", "carvi", "cumino dei prati", "alcaravea", "caraway seed|caraway");
c("vanilla", "vanilla", "香草精", "バニラ", "vanille", "vaniglia", "vainilla", "vanilla extract|vanilla essence|vanilla pod|vanilla bean|vanilla sugar|vanilla bean paste|香草|香草荚|バニラエッセンス|バニラビーンズ|extrait de vanille|gousse de vanille|estratto di vaniglia|extracto de vainilla");
c("almond-extract", "almond extract", "杏仁精", "アーモンドエッセンス", "extrait d’amande amère", "estratto di mandorla", "extracto de almendra", "almond essence");

// Sauces, seasonings and vinegars
c("soy-sauce", "soy sauce", "酱油", "醤油", "sauce soja", "salsa di soia", "salsa de soja", "light soy sauce|dark soy sauce|lite soy sauce|light color soy sauce|low sodium soy sauce|tamari|shoyu|生抽|老抽|味极鲜|しょうゆ|しょう油|薄口醤油|濃口醤油|sauce soya|salsa di soya|salsa de soya");
c("fish-sauce", "fish sauce", "鱼露", "ナンプラー", "sauce de poisson", "salsa di pesce", "salsa de pescado", "nam pla|nuoc mam|nước mắm|colatura di alici");
c("oyster-sauce", "oyster sauce", "蚝油", "オイスターソース", "sauce d’huître", "salsa d’ostrica", "salsa de ostras", "");
c("worcestershire", "Worcestershire sauce", "伍斯特酱", "ウスターソース", "sauce Worcestershire", "salsa Worcestershire", "salsa inglesa", "worcestershire|worcester sauce|辣酱油|喼汁");
c("ketchup", "ketchup", "番茄沙司", "ケチャップ", "ketchup", "ketchup", "kétchup", "tomato ketchup|catsup|番茄酱沙司");
c("mayonnaise", "mayonnaise", "蛋黄酱", "マヨネーズ", "mayonnaise", "maionese", "mayonesa", "mayo|commercial mayonnaise|沙拉酱|丘比沙拉酱");
c("mustard", "mustard", "芥末酱", "マスタード", "moutarde", "senape", "mostaza", "dijon mustard|english mustard|wholegrain mustard|whole grain mustard|yellow mustard|mustard powder|dry mustard|からし|和からし|moutarde de dijon|moutarde à lancienne|senape di digione");
c("hot-sauce", "hot sauce", "辣椒酱", "ホットソース", "sauce piquante", "salsa piccante", "salsa picante", "hotsauce|sriracha|tabasco|chili sauce|chilli sauce|chili oil|chilli oil|chile oil|辣酱|辣椒油|红油|老干妈|是拉差|チリソース|ラー油|食べるラー油");
c("sweet-chili-sauce", "sweet chili sauce", "泰式甜辣酱", "スイートチリソース", "sauce chili douce", "salsa chili dolce", "salsa de chile dulce", "sweet chilli sauce|thai sweet chili sauce");
c("vinegar", "vinegar", "白醋", "酢", "vinaigre", "aceto", "vinagre", "white vinegar|distilled vinegar|white wine vinegar|red wine vinegar|cider vinegar|apple cider vinegar|sherry vinegar|malt vinegar|醋|穀物酢|りんご酢|vinaigre de vin|vinaigre de cidre|vinaigre de xérès|aceto di vino|aceto di mele|vinagre de vino|vinagre de manzana|vinagre de jerez", "vinegar");
c("rice-vinegar", "rice vinegar", "米醋", "米酢", "vinaigre de riz", "aceto di riso", "vinagre de arroz", "rice wine vinegar|seasoned rice vinegar|sushi vinegar|寿司醋|すし酢", "vinegar");
c("black-vinegar", "black vinegar", "香醋", "黒酢", "vinaigre noir", "aceto nero", "vinagre negro", "chinkiang vinegar|chinese black vinegar|chinese aromatic vinegar|陈醋|黑醋|镇江香醋|老陈醋", "vinegar");
c("balsamic", "balsamic vinegar", "意大利香醋", "バルサミコ酢", "vinaigre balsamique", "aceto balsamico", "vinagre balsámico", "balsamic|balsamic glaze|crème de balsamique|glassa di aceto balsamico", "vinegar");
c("miso", "miso", "味噌", "味噌", "miso", "miso", "miso", "white miso|red miso|shiro miso|みそ|ミソ|白味噌|赤味噌");
c("gochujang", "gochujang", "韩式辣酱", "コチュジャン", "gochujang", "gochujang", "gochujang", "korean chili paste|korean red pepper paste|red pepper paste|韩国辣酱");
c("doubanjiang", "doubanjiang", "郫县豆瓣酱", "豆板醤", "doubanjiang", "doubanjiang", "doubanjiang", "chili bean paste|chilli bean paste|broad bean paste|豆瓣酱|豆瓣醤");
c("sweet-bean-paste", "sweet bean sauce", "甜面酱", "甜麺醤", "sauce aux haricots sucrée", "salsa di fagioli dolce", "salsa de frijol dulce", "sweet bean paste|yellow bean sauce|soybean paste|黄豆酱|大酱|テンメンジャン|doenjang");
c("hoisin", "hoisin sauce", "海鲜酱", "海鮮醤", "sauce hoisin", "salsa hoisin", "salsa hoisin", "hoisin");
c("black-beans-fermented", "fermented black beans", "豆豉", "豆豉", "haricots noirs fermentés", "fagioli neri fermentati", "frijoles negros fermentados", "black bean sauce|douchi|豆豉酱");
c("curry-paste", "curry paste", "咖喱酱", "カレーペースト", "pâte de curry", "pasta di curry", "pasta de curry", "thai red curry paste|thai green curry paste|red curry paste|green curry paste|yellow curry paste|massaman curry paste|红咖喱酱|绿咖喱酱|レッドカレーペースト|グリーンカレーペースト");
c("tahini", "tahini", "芝麻酱", "練りごま", "tahini", "tahina", "tahini", "sesame paste|tahina|芝麻糊|ねりごま");
c("peanut-butter", "peanut butter", "花生酱", "ピーナッツバター", "beurre de cacahuète", "burro di arachidi", "mantequilla de cacahuete", "crunchy peanut butter|smooth peanut butter|beurre de cacahuete|crema de cacahuete|crema di arachidi");
c("tamarind", "tamarind", "罗望子", "タマリンド", "tamarin", "tamarindo", "tamarindo", "tamarind paste|tamarind concentrate|tamarind pulp|酸角");
c("stock", "stock", "高汤", "スープの素", "bouillon", "brodo", "caldo", "chicken stock|beef stock|vegetable stock|fish stock|chicken broth|beef broth|vegetable broth|bone broth|low sodium chicken broth|broth|stock cube|stock cubes|chicken stock cube|vegetable stock cube|beef stock cube|bouillon cube|chicken bouillon|chicken bouillon powder|chicken stock seasoning|stock powder|consomme|鸡汤|鸡精|高湯|鸡粉|浓汤宝|骨头汤|コンソメ|鶏ガラスープの素|中華だし|ブイヨン|bouillon de poulet|bouillon de légumes|fond de volaille|brodo di pollo|brodo vegetale|dado|caldo de pollo|caldo de verduras|pastilla de caldo", "stock");
c("dashi", "dashi", "日式高汤", "だし", "dashi", "dashi", "dashi", "dashi stock|hondashi|kombu dashi|dashi powder|出汁|だしの素|和風だし|白だし", "stock");
c("shaoxing", "Shaoxing wine", "料酒", "紹興酒", "vin de Shaoxing", "vino di Shaoxing", "vino de Shaoxing", "shaoxing|cooking wine|chinese cooking wine|rice wine|绍兴酒|黄酒|花雕酒|米酒|vin de riz|vino di riso|vino de arroz", "cooking-wine");
c("sake", "sake", "清酒", "酒", "saké", "sakè", "sake", "cooking sake|cheongju|cheongju rice wine|日本酒|料理酒|清酒|saké de cuisine", "cooking-wine");
c("sherry", "dry sherry", "雪利酒", "シェリー酒", "xérès", "sherry", "jerez", "sherry|fino sherry|vino de jerez|madeira|marsala|port|波特酒|マルサラ|porto|vino marsala", "cooking-wine");
c("mirin", "mirin", "味醂", "みりん", "mirin", "mirin", "mirin", "ミリン|本みりん|みりん風調味料");
c("white-wine", "white wine", "白葡萄酒", "白ワイン", "vin blanc", "vino bianco", "vino blanco", "dry white wine|vermouth|dry vermouth|白ワイン");
c("red-wine", "red wine", "红葡萄酒", "赤ワイン", "vin rouge", "vino rosso", "vino tinto", "dry red wine|红酒");
c("beer", "beer", "啤酒", "ビール", "bière", "birra", "cerveza", "lager|ale|stout|pale ale|bière blonde");
c("sugar", "sugar", "白糖", "砂糖", "sucre", "zucchero", "azúcar", "white sugar|caster sugar|granulated sugar|white granulated sugar|golden caster sugar|superfine sugar|cane sugar|糖|白砂糖|细砂糖|绵白糖|冰糖|rock sugar|グラニュー糖|上白糖|氷砂糖|sucre en poudre|sucre semoule|sucre blanc|zucchero semolato|azucar|azúcar blanco", "sugar");
c("brown-sugar", "brown sugar", "红糖", "きび砂糖", "sucre roux", "zucchero di canna", "azúcar moreno", "light brown sugar|light brown soft sugar|coco sugar|dark brown sugar|dark brown soft sugar|soft brown sugar|muscovado|muscovado sugar|demerara|demerara sugar|palm sugar|coconut sugar|jaggery|panela|piloncillo|黄糖|黑糖|椰糖|片糖|三温糖|黒砂糖|cassonade|vergeoise|sucre muscovado|azucar moreno|azúcar mascabado", "sugar");
c("icing-sugar", "icing sugar", "糖粉", "粉砂糖", "sucre glace", "zucchero a velo", "azúcar glas", "powdered sugar|confectioners sugar|confectioners' sugar|azucar glas|azúcar glass|azúcar impalpable", "sugar");
c("honey", "honey", "蜂蜜", "はちみつ", "miel", "miele", "miel", "clear honey|runny honey|ハチミツ|蜂蜜水", "syrup");
c("syrup", "syrup", "糖浆", "シロップ", "sirop", "sciroppo", "sirope", "maple syrup|golden syrup|corn syrup|light corn syrup|agave|agave syrup|agave nectar|molasses|black treacle|treacle|date syrup|simple syrup|sugar syrup|sirop de liege|sirop de liège|sirop derable|sciroppo dacero|sirope de arce|糖蜜|枫糖浆|メープルシロップ|ガムシロップ|melaza", "syrup");
c("jam", "jam", "果酱", "ジャム", "confiture", "marmellata", "mermelada", "raspberry jam|strawberry jam|apricot jam|marmalade|preserves|fruit preserves|confiture de framboises|confettura");
c("cream-of-tartar", "cream of tartar", "塔塔粉", "クリームタータ", "crème de tartre", "cremor tartaro", "crémor tártaro", "");

// Flours, grains, pasta and bread
c("flour", "flour", "面粉", "小麦粉", "farine", "farina", "harina", "plain flour|all purpose flour|wheat flour|self raising flour|self rising flour|strong white bread flour|bread flour|strong flour|whole wheat flour|wholemeal flour|cake flour|pastry flour|00 flour|type 00 flour|中筋面粉|低筋面粉|高筋面粉|普通面粉|全麦面粉|薄力粉|強力粉|中力粉|farine de blé|farine t45|farine t55|farina 00|farina di grano|harina de trigo|harina común");
c("starch", "cornstarch", "玉米淀粉", "コーンスターチ", "fécule de maïs", "amido di mais", "maicena", "cornflour|corn flour|corn starch|starch|arrowroot|淀粉|生粉|水淀粉|maïzena|maizena|amido|almidón de maíz|fécula de maíz", "starch");
c("potato-starch", "potato starch", "土豆淀粉", "片栗粉", "fécule de pomme de terre", "fecola di patate", "fécula de patata", "tapioca starch|tapioca flour|sweet potato starch|木薯淀粉|红薯淀粉|太白粉|かたくり粉|fécule|fecola|almidón de papa", "starch");
c("rice-flour", "rice flour", "粘米粉", "米粉", "farine de riz", "farina di riso", "harina de arroz", "glutinous rice flour|sweet rice flour|糯米粉|大米粉|白玉粉|上新粉|もち粉");
c("chickpea-flour", "chickpea flour", "鹰嘴豆粉", "ひよこ豆粉", "farine de pois chiches", "farina di ceci", "harina de garbanzo", "gram flour|besan");
c("cornmeal", "cornmeal", "玉米面", "コーンミール", "semoule de maïs", "farina di mais", "harina de maíz", "polenta|masa harina|grits|玉米粉|玉米碴|コーングリッツ|masa de maíz");
c("semolina", "semolina", "粗粒小麦粉", "セモリナ粉", "semoule", "semola", "sémola", "semolina flour|durum wheat semolina|semola di grano duro|semola rimacinata");
c("baking-powder", "baking powder", "泡打粉", "ベーキングパウダー", "levure chimique", "lievito per dolci", "polvo de hornear", "levadura química|levadura en polvo|polvo para hornear|lievito chimico");
c("baking-soda", "baking soda", "小苏打", "重曹", "bicarbonate", "bicarbonato", "bicarbonato", "bicarbonate of soda|bicarbonate de soude|bicarbonato di sodio|bicarbonato de sodio|ベーキングソーダ|食用碱|碱面");
c("yeast", "yeast", "酵母", "イースト", "levure", "lievito", "levadura", "instant yeast|active dry yeast|dried yeast|fast action yeast|easy bake yeast|fresh yeast|干酵母|酵母粉|ドライイースト|levure de boulanger|lievito di birra|lievito secco|levadura seca|levadura fresca");
c("rice", "rice", "大米", "米", "riz", "riso", "arroz", "basmati rice|jasmine rice|long grain rice|short grain rice|white rice|brown rice|cooked rice|uncooked rice|paella rice|arborio rice|carnaroli|risotto rice|sushi rice|cooked short grain white rice|uncooked short grain rice|米饭|白米饭|剩米饭|ご飯|ごはん|白米|riz basmati|riz rond|riso arborio|riso carnaroli|arroz bomba|arroz blanco");
c("glutinous-rice", "glutinous rice", "糯米", "もち米", "riz gluant", "riso glutinoso", "arroz glutinoso", "sticky rice|sweet rice|mochigome|江米");
c("pasta", "pasta", "意大利面", "パスタ", "pâtes", "pasta", "pasta", "spaghetti|macaroni|penne|linguine|fettuccine|tagliatelle|rigatoni|fusilli|farfalle|conchiglie|bucatini|pappardelle|lasagne sheets|lasagna sheets|lasagne|orzo|dried pasta|意面|通心粉|意粉|スパゲッティ|マカロニ|ペンネ|pates|spaghettis|pâtes sèches|espaguetis|macarrones|fideos de pasta");
c("noodles", "noodles", "面条", "麺", "nouilles", "noodles", "fideos", "noodle|egg noodles|rice noodles|rice vermicelli|rice sticks|vermicelli|udon|soba|ramen noodles|ramen|glass noodles|mung bean noodles|wheat noodles|lo mein|面|挂面|鲜面条|手擀面|乌冬面|河粉|粉丝|米线|米粉丝|方便面|うどん|そば|ラーメン|中華麺|春雨|そうめん|nouilles de riz|vermicelles de riz|spaghetti di riso|fideos de arroz");
c("couscous", "couscous", "古斯米", "クスクス", "couscous", "cuscus", "cuscús", "giant couscous|pearl couscous", "small-grain");
c("bulgur", "bulgur", "碾碎干小麦", "ブルグル", "boulgour", "bulgur", "bulgur", "bulgur wheat|bulghur|cracked wheat", "small-grain");
c("quinoa", "quinoa", "藜麦", "キヌア", "quinoa", "quinoa", "quinoa", "", "small-grain");
c("oats", "rolled oats", "燕麦片", "オートミール", "flocons d’avoine", "fiocchi d’avena", "copos de avena", "oats|oatmeal|porridge oats|quick oats|燕麦|avoine|avena");
c("bread", "bread", "面包", "パン", "pain", "pane", "pan", "white bread|sandwich bread|crusty bread|baguette|whole wheat bread|wholemeal bread|sourdough|sourdough bread|ciabatta|day old bread|stale bread|brioche|吐司|切片面包|法棍|食パン|バゲット|pain de mie|pain rassis|pane in cassetta|pane raffermo|pan de molde|pan duro|barra de pan", "bread");
c("flatbread", "flatbread", "饼", "フラットブレッド", "pain plat", "piadina", "pan plano", "pita|pita bread|pitas|whole wheat pitas|naan|naan bread|lavash|chapati|roti|皮塔饼|馕|ナン|pain pita|pane pita|pan de pita", "bread");
c("breadcrumbs", "breadcrumbs", "面包糠", "パン粉", "chapelure", "pangrattato", "pan rallado", "bread crumbs|panko|panko breadcrumbs|whole wheat breadcrumbs|dried breadcrumbs|面包屑|パンコ|chapelure panko");
c("tortilla", "tortillas", "墨西哥薄饼", "トルティーヤ", "tortillas", "tortillas", "tortillas", "tortilla|corn tortillas|flour tortillas|wraps|tortilla wraps|tortilla chips|卷饼|玉米饼");
c("puff-pastry", "puff pastry", "酥皮", "パイシート", "pâte feuilletée", "pasta sfoglia", "hojaldre", "ready rolled puff pastry|frozen puff pastry|起酥皮|千层酥皮|冷冻パイシート|pate feuilletee|masa de hojaldre");
c("shortcrust", "shortcrust pastry", "挞皮", "タルト生地", "pâte brisée", "pasta brisée", "masa quebrada", "pie crust|pie dough|sweet shortcrust pastry|pâte sablée|pate brisee|pasta frolla|masa brisa");
c("filo", "filo pastry", "千层薄酥皮", "フィロ生地", "pâte filo", "pasta fillo", "masa filo", "phyllo|phyllo dough|filo|brick pastry|feuilles de brick|pasta phyllo");
c("pizza-dough", "pizza dough", "披萨面团", "ピザ生地", "pâte à pizza", "impasto per pizza", "masa de pizza", "ready to bake pizza dough|pizza base|pizza bases|披萨饼底|ピザ台|base pizza");
c("wrappers", "dumpling wrappers", "饺子皮", "餃子の皮", "feuilles à raviolis", "sfoglie per ravioli cinesi", "obleas para empanadillas", "dumpling skins|wonton wrappers|gyoza wrappers|spring roll wrappers|spring roll pastry|rice paper|rice paper wrappers|馄饨皮|云吞皮|春卷皮|烧卖皮|ワンタンの皮|春巻きの皮|ライスペーパー|feuilles de riz|galettes de riz|carta di riso|papel de arroz");

// Legumes, nuts and seeds
c("beans", "beans", "豆子", "豆", "haricots", "fagioli", "alubias", "kidney beans|black beans|cannellini beans|butter beans|lima beans|white beans|dried white beans|borlotti beans|pinto beans|haricot beans|navy beans|baked beans|red beans|red kidney beans|adzuki beans|azuki beans|broad beans|fava beans|红豆|黑豆|芸豆|白芸豆|红腰豆|蚕豆|小豆|いんげん豆|金時豆|そら豆|haricots rouges|haricots blancs|fèves|fagioli cannellini|fagioli borlotti|fave|frijoles|frijoles negros|judías blancas|alubias blancas|habas", "beans");
c("chickpeas", "chickpeas", "鹰嘴豆", "ひよこ豆", "pois chiches", "ceci", "garbanzos", "chickpea|garbanzo beans|garbanzo|ガルバンゾ", "beans");
c("lentils", "lentils", "小扁豆", "レンズ豆", "lentilles", "lenticchie", "lentejas", "lentil|red lentils|brown lentils|green lentils|puy lentils|split peas|yellow split peas|dal|dhal|masoor dal|toor dal|红扁豆|lentille|lenticchia|lenteja");
c("soybeans", "soybeans", "黄豆", "大豆", "graines de soja", "semi di soia", "soja en grano", "soy beans|soya beans|edamame|毛豆|枝豆|haricots de soja|fagioli di soia");
c("kinako", "kinako", "黄豆粉", "きな粉", "farine de soja grillé", "farina di soia tostata", "harina de soja tostada", "kinako roasted soybean flour|roasted soybean flour|soy flour|きなこ");
c("almonds", "almonds", "杏仁", "アーモンド", "amandes", "mandorle", "almendras", "almond|ground almonds|flaked almonds|almond flour|almond meal|slivered almonds|blanched almonds|杏仁片|杏仁粉|アーモンドプードル|amande|poudre damande|amandes effilées|mandorla|farina di mandorle|almendra|almendra molida");
c("walnuts", "walnuts", "核桃", "くるみ", "noix", "noci", "nueces", "walnut|walnut halves|核桃仁|クルミ|cerneaux de noix|noce|nuez", "walnut-pecan");
c("pecans", "pecans", "碧根果", "ピーカンナッツ", "noix de pécan", "noci pecan", "nueces pecanas", "pecan|pecan nuts|pecan halves|美国山核桃|ペカン|pécan", "walnut-pecan");
c("cashews", "cashews", "腰果", "カシューナッツ", "noix de cajou", "anacardi", "anacardos", "cashew|cashew nuts|raw cashews|anacardo|castañas de cajú");
c("hazelnuts", "hazelnuts", "榛子", "ヘーゼルナッツ", "noisettes", "nocciole", "avellanas", "hazelnut|ground hazelnuts|榛仁|noisette|nocciola|avellana");
c("pistachios", "pistachios", "开心果", "ピスタチオ", "pistaches", "pistacchi", "pistachos", "pistachio|pistachio nuts|pistache|pistacchio|pistacho");
c("peanuts", "peanuts", "花生", "ピーナッツ", "cacahuètes", "arachidi", "cacahuetes", "peanut|roasted peanut|roasted peanuts|salted peanuts|groundnuts|花生米|花生碎|落花生|cacahuete|cacahouètes|noccioline|maní|cacahuates");
c("pine-nuts", "pine nuts", "松子", "松の実", "pignons de pin", "pinoli", "piñones", "pine kernels|pignons|松仁");
c("seeds", "pumpkin seeds", "南瓜子", "かぼちゃの種", "graines de courge", "semi di zucca", "pipas de calabaza", "pepitas|sunflower seeds|chia seeds|flaxseed|flax seeds|linseed|葵花籽|瓜子|奇亚籽|亚麻籽|ひまわりの種|チアシード|graines de tournesol|graines de chia|semi di girasole|semi di chia|semillas de girasol|semillas de chía");
c("sesame", "sesame seeds", "芝麻", "ごま", "graines de sésame", "semi di sesamo", "semillas de sésamo", "sesame|sesame seed|white sesame seeds|black sesame seeds|toasted sesame seeds|白芝麻|黑芝麻|熟芝麻|いりごま|白ごま|黒ごま|ゴマ|sésame|sesamo|sésamo");
c("coconut", "coconut", "椰子", "ココナッツ", "noix de coco", "cocco", "coco", "desiccated coconut|shredded coconut|coconut flakes|grated coconut|椰蓉|椰丝|ココナッツファイン|coco râpé|cocco rapè|cocco grattugiato|coco rallado");
c("coconut-milk", "coconut milk", "椰浆", "ココナッツミルク", "lait de coco", "latte di cocco", "leche de coco", "coconut cream|tinned coconut milk|canned coconut milk|light coconut milk|椰奶|椰汁|ココナッツクリーム|crème de coco|crema di cocco|crema de coco");

// Fruit, citrus and sweet things
c("lemon", "lemon", "柠檬", "レモン", "citron", "limone", "limón", "lemons|lemon juice|lemon zest|fresh lemon juice|juice of lemon|zest of lemon|柠檬汁|レモン汁|jus de citron|zeste de citron|succo di limone|scorza di limone|zumo de limón|jugo de limón|ralladura de limón", "citrus");
c("lime", "lime", "青柠", "ライム", "citron vert", "lime", "lima", "limes|lime juice|lime zest|fresh lime juice|juice of lime|青柠汁|ライム果汁|jus de citron vert|succo di lime|zumo de lima|jugo de lima|limón verde", "citrus");
c("orange", "orange", "橙子", "オレンジ", "orange", "arancia", "naranja", "oranges|orange juice|orange zest|unsweetened orange juice|blood orange|clementine|clementines|mandarin|satsuma|橙汁|橘子|柑橘|オレンジジュース|みかん|jus dorange|zeste dorange|succo darancia|mandarino|zumo de naranja|jugo de naranja|mandarina");
c("apple", "apples", "苹果", "りんご", "pommes", "mele", "manzanas", "apple|cooking apples|green apple|green apples|granny smith|bramley apples|リンゴ|pomme|mela|manzana");
c("pear", "pears", "梨", "洋梨", "poires", "pere", "peras", "pear|large ripe d’anjou pear|ripe pears|poire|pera|ナシ");
c("banana", "bananas", "香蕉", "バナナ", "bananes", "banane", "plátanos", "banana|ripe bananas|banane mûre|plátano|banano");
c("berries", "berries", "浆果", "ベリー", "fruits rouges", "frutti di bosco", "frutos rojos", "mixed berries|blueberries|blueberry|blackberries|blackberry|蓝莓|黑莓|ブルーベリー|myrtilles|mûres|mirtilli|arándanos|moras", "berry");
c("strawberries", "strawberries", "草莓", "いちご", "fraises", "fragole", "fresas", "strawberry|イチゴ|fraise|fragola|fresa|frutillas", "berry");
c("raspberries", "raspberries", "树莓", "ラズベリー", "framboises", "lamponi", "frambuesas", "raspberry|覆盆子|framboise|lampone|frambuesa", "berry");
c("cranberries", "cranberries", "蔓越莓", "クランベリー", "canneberges", "mirtilli rossi", "arándanos rojos", "cranberry|fresh cranberries|frozen cranberries");
c("mango", "mango", "芒果", "マンゴー", "mangue", "mango", "mango", "mangoes|mangos|ripe mango");
c("peach", "peaches", "桃子", "桃", "pêches", "pesche", "melocotones", "peach|nectarines|nectarine|tinned peaches|桃|黄桃|もも|pêche|nectarine|pesca|melocotón|durazno|duraznos", "stone-fruit");
c("apricot", "apricots", "杏", "あんず", "abricots", "albicocche", "albaricoques", "apricot|fresh apricots|杏子|アプリコット|abricot|albicocca|albaricoque|damasco", "stone-fruit");
c("cherries", "cherries", "樱桃", "さくらんぼ", "cerises", "ciliegie", "cerezas", "cherry|sour cherries|morello cherries|车厘子|チェリー|cerise|ciliegia|cereza");
c("pineapple", "pineapple", "菠萝", "パイナップル", "ananas", "ananas", "piña", "pineapple chunks|fresh pineapple|tinned pineapple|凤梨|パイン");
c("grapes", "grapes", "葡萄", "ぶどう", "raisins frais", "uva", "uvas", "grape|red grapes|green grapes|ブドウ|raisin frais|acini duva");
c("melon", "melon", "甜瓜", "メロン", "melon", "melone", "melón", "watermelon|cantaloupe|honeydew|西瓜|哈密瓜|スイカ|pastèque|anguria|cocomero|sandía");
c("pomegranate", "pomegranate", "石榴", "ざくろ", "grenade", "melograno", "granada", "pomegranate seeds|pomegranate molasses|石榴籽|grenadine");
c("raisins", "raisins", "葡萄干", "レーズン", "raisins secs", "uvetta", "pasas", "raisin|sultanas|sultana|currants|golden raisins|dried currants|dried fruit|mixed dried fruit|干果|ドライフルーツ|raisins de corinthe|uva passa|uvas pasas|pasas de corinto", "dried-fruit");
c("dried-cranberries", "dried cranberries", "蔓越莓干", "ドライクランベリー", "canneberges séchées", "mirtilli rossi essiccati", "arándanos deshidratados", "craisins", "dried-fruit");
c("dried-apricots", "dried apricots", "杏干", "干しあんず", "abricots secs", "albicocche secche", "orejones", "dried apricot|杏脯", "dried-fruit");
c("dates", "dates", "椰枣", "デーツ", "dattes", "datteri", "dátiles", "date|medjool dates|pitted dates|dattes medjool|dattero|dátil", "dried-fruit");
c("prunes", "prunes", "西梅干", "プルーン", "pruneaux", "prugne secche", "ciruelas pasas", "prune|pitted prunes|西梅|pruneau", "dried-fruit");
c("red-dates", "jujubes", "红枣", "なつめ", "jujubes", "giuggiole", "azufaifas", "red dates|chinese dates|jujube|dried jujubes|大枣|干枣|ナツメ", "dried-fruit");
c("goji", "goji berries", "枸杞", "クコの実", "baies de goji", "bacche di goji", "bayas de goji", "goji|wolfberries|枸杞子", "dried-fruit");
c("candied-peel", "candied peel", "蜜饯果皮", "オレンジピール", "écorces confites", "canditi", "fruta confitada", "mixed peel|candied orange peel|glacé cherries|candied cherries|蜜饯|ピール|fruits confits|frutta candita");
c("chocolate", "chocolate", "巧克力", "チョコレート", "chocolat", "cioccolato", "chocolate", "dark chocolate|milk chocolate|white chocolate|chocolate chips|chocolate chunks|plain chocolate|bittersweet chocolate|semisweet chocolate|cooking chocolate|黑巧克力|白巧克力|巧克力豆|チョコ|板チョコ|chocolat noir|chocolat au lait|pépites de chocolat|cioccolato fondente|gocce di cioccolato|chocolate negro|chispas de chocolate");
c("cocoa", "cocoa powder", "可可粉", "ココアパウダー", "cacao en poudre", "cacao in polvere", "cacao en polvo", "cocoa|unsweetened cocoa|unsweetened cocoa powder|cacao|cacao powder|可可|ココア|cacao amer");
c("gelatin", "gelatin", "吉利丁", "ゼラチン", "gélatine", "gelatina", "gelatina", "gelatine|gelatin sheets|gelatine leaves|powdered gelatin|鱼胶粉|吉利丁片|吉利丁粉|粉ゼラチン|板ゼラチン|feuilles de gélatine|colla di pesce|láminas de gelatina", "gel");
c("agar", "agar", "琼脂", "寒天", "agar-agar", "agar agar", "agar agar", "agar agar|agar powder|琼脂粉|洋菜|粉寒天|かんてん", "gel");
c("biscuits", "biscuits", "饼干", "ビスケット", "biscuits", "biscotti", "galletas", "digestive biscuits|graham crackers|cookies|shortbread|rich tea biscuits|oreos|消化饼干|奥利奥|クッキー|petits beurre|spéculoos|biscotti secchi|biscotti digestive|galletas maría");
c("ladyfingers", "ladyfingers", "手指饼干", "フィンガービスケット", "biscuits à la cuillère", "savoiardi", "bizcochos de soletilla", "lady fingers|savoiardi biscuits|sponge fingers|boudoirs");
c("ice-cream", "ice cream", "冰淇淋", "アイスクリーム", "glace", "gelato", "helado", "vanilla ice cream|雪糕|アイス|glace à la vanille|gelato alla vaniglia|helado de vainilla");
c("custard", "custard", "卡仕达酱", "カスタード", "crème anglaise", "crema pasticcera", "natillas", "custard powder|crème pâtissière|カスタードクリーム");
c("coffee", "coffee", "咖啡", "コーヒー", "café", "caffè", "café", "espresso|strong coffee|instant coffee|instant espresso|brewed coffee|咖啡粉|速溶咖啡|浓缩咖啡|エスプレッソ|インスタントコーヒー|café soluble|caffè espresso|café instantáneo");
c("tea", "tea", "茶", "お茶", "thé", "tè", "té", "black tea|green tea|matcha|tea bags|jasmine tea|红茶|绿茶|抹茶|茶叶|紅茶|緑茶|thé vert|tè verde|té verde");

// Drinks and mixers (cocktail recipes)
c("soda-water", "soda water", "苏打水", "炭酸水", "eau gazeuse", "acqua frizzante", "agua con gas", "carbonated water|sparkling water|club soda|气泡水|eau pétillante|soda", "mixer");
c("tonic", "tonic water", "汤力水", "トニックウォーター", "tonic", "acqua tonica", "agua tónica", "tonic|indian tonic water", "mixer");
c("cola", "cola", "可乐", "コーラ", "cola", "cola", "refresco de cola", "coca cola|coke|ginger ale|ginger beer|lemonade|sprite|lemon lime soda|雪碧|姜汁汽水|ジンジャーエール|limonade|gazzosa|gaseosa");
c("rum", "rum", "朗姆酒", "ラム酒", "rhum", "rum", "ron", "white rum|dark rum|light rum|spiced rum|gold rum|ラム|rhum blanc|ron blanco");
c("vodka", "vodka", "伏特加", "ウォッカ", "vodka", "vodka", "vodka", "");
c("gin", "gin", "金酒", "ジン", "gin", "gin", "ginebra", "dry gin|london dry gin|杜松子酒");
c("tequila", "tequila", "龙舌兰酒", "テキーラ", "tequila", "tequila", "tequila", "mezcal|blanco tequila|tequila blanco|龙舌兰|メスカル");
c("whisky", "whisky", "威士忌", "ウイスキー", "whisky", "whisky", "whisky", "whiskey|bourbon|scotch|rye whiskey|波本|バーボン");
c("brandy", "brandy", "白兰地", "ブランデー", "cognac", "brandy", "brandy", "cognac|armagnac|calvados|pisco|干邑|コニャック|coñac");
c("liqueur", "orange liqueur", "橙味利口酒", "オレンジリキュール", "triple sec", "liquore all’arancia", "licor de naranja", "triple sec|cointreau|grand marnier|curaçao|curacao|blue curacao|君度|コアントロー");
c("bitters", "bitters", "苦精", "ビターズ", "amer", "bitter", "amargo", "angostura bitters|angostura|aromatic bitters|orange bitters|campari|aperol|安格斯特拉|カンパリ|amaro");
c("baijiu", "baijiu", "白酒", "白酒", "baijiu", "baijiu", "baijiu", "chinese liquor|高粱酒|二锅头");
c("orange-blossom", "orange blossom water", "橙花水", "オレンジフラワーウォーター", "eau de fleur d’oranger", "acqua di fiori d’arancio", "agua de azahar", "orange flower water");
c("rose-water", "rose water", "玫瑰水", "ローズウォーター", "eau de rose", "acqua di rose", "agua de rosas", "rosewater");
c("coconut-water", "coconut water", "椰子水", "ココナッツウォーター", "eau de coco", "acqua di cocco", "agua de coco", "椰青水");

// Less common ingredients that still appear in several recipes.
c("olives", "olives", "橄榄", "オリーブ", "olives", "olive", "aceitunas", "olive|black olives|green olives|pitted black olives|pitted olives|kalamata olives|黑橄榄|青橄榄|olive nere|olive verdi|aceitunas negras");
c("capers", "capers", "刺山柑", "ケッパー", "câpres", "capperi", "alcaparras", "caper|capers in brine|酸豆|刺山柑花蕾");
c("bonito", "bonito flakes", "柴鱼片", "かつお節", "copeaux de bonite", "fiocchi di bonito", "copos de bonito", "katsuobushi|dried bonito flakes|鲣鱼片|木鱼花|削り節");
c("pickles", "pickles", "酸黄瓜", "ピクルス", "cornichons", "cetriolini sottaceto", "pepinillos", "pickle|dill pickles|gherkins|gherkin|pickled cucumber|pickled cucumbers|pickle juice|榨菜|腌黄瓜|cornichon|cetriolini|pepinillo");
c("sauerkraut", "sauerkraut", "酸菜", "ザワークラウト", "choucroute", "crauti", "chucrut", "fermented cabbage|东北酸菜|德国酸菜");
c("kimchi", "kimchi", "韩国泡菜", "キムチ", "kimchi", "kimchi", "kimchi", "泡菜|辣白菜");
c("bbq-sauce", "barbecue sauce", "烧烤酱", "バーベキューソース", "sauce barbecue", "salsa barbecue", "salsa barbacoa", "bbq sauce|barbeque sauce|烤肉酱|焼肉のたれ");
c("harissa", "harissa", "哈里萨辣酱", "ハリッサ", "harissa", "harissa", "harissa", "harissa paste|harissa spice|rose harissa");
c("celeriac", "celeriac", "根芹菜", "セロリアック", "céleri-rave", "sedano rapa", "apionabo", "celery root|celeri rave");
c("msg", "MSG", "味精", "うま味調味料", "glutamate", "glutammato", "glutamato", "monosodium glutamate|味の素|ajinomoto");
c("horseradish", "horseradish", "辣根", "わさび", "raifort", "rafano", "rábano picante", "prepared horseradish|prepared grated horseradish|wasabi|wasabi paste|芥末|山葵|西洋わさび|ホースラディッシュ");
c("figs", "figs", "无花果", "いちじく", "figues", "fichi", "higos", "fig|dried figs|fresh figs|イチジク|figue|fico|higo");
c("mackerel", "mackerel", "鲭鱼", "サバ", "maquereau", "sgombro", "caballa", "smoked mackerel|mackerel fillets|鲅鱼|さば|秋刀鱼|サンマ|maquereaux", "oily-fish");
c("sardines", "sardines", "沙丁鱼", "いわし", "sardines", "sarde", "sardinas", "sardine|tinned sardines|イワシ|sardina", "oily-fish");
c("plantain", "plantains", "大蕉", "プランテン", "bananes plantains", "platani", "plátanos macho", "plantain|green plantains|ripe plantains|banane plantain|plátano macho|plátano verde");
c("rhubarb", "rhubarb", "大黄", "ルバーブ", "rhubarbe", "rabarbaro", "ruibarbo", "rhubarb stalks");
c("chestnuts", "chestnuts", "栗子", "栗", "châtaignes", "castagne", "castañas", "chestnut|peeled chestnuts|roasted chestnuts|板栗|甘栗|マロン|marrons|marron|castagna|castaña");
c("water-chestnut", "water chestnuts", "荸荠", "くわい", "châtaignes d’eau", "castagne d’acqua", "castañas de agua", "water chestnut|马蹄");
c("winter-melon", "winter melon", "冬瓜", "冬瓜", "courge cireuse", "melone d’inverno", "melón de invierno", "wax gourd|ash gourd");
c("dried-shrimp", "dried shrimp", "虾米", "干しえび", "crevettes séchées", "gamberetti essiccati", "camarones secos", "dried shrimps|虾皮|海米|桜えび|干しエビ");
c("liver", "liver", "肝", "レバー", "foie", "fegato", "hígado", "chicken liver|chicken livers|lamb liver|calf liver|pork liver|鸡肝|猪肝|鶏レバー|foies de volaille|fegatini|higaditos");
c("kidney", "kidneys", "腰子", "腎臓", "rognons", "rognone", "riñones", "kidney|lamb kidney|lamb kidneys|腰花|rognon");
c("poppy", "poppy seeds", "罂粟籽", "けしの実", "graines de pavot", "semi di papavero", "semillas de amapola", "poppy seed|ground poppy seeds");
c("marshmallows", "marshmallows", "棉花糖", "マシュマロ", "guimauves", "marshmallow", "malvaviscos", "marshmallow|miniature marshmallows|mini marshmallows|chamallows|nubes");
c("tempeh", "tempeh", "天贝", "テンペ", "tempeh", "tempeh", "tempeh", "");
c("cassava", "cassava", "木薯", "キャッサバ", "manioc", "manioca", "yuca", "tapioca|tapioca pearls|木薯粉圆|タピオカ|mandioca");
c("sumac", "sumac", "漆树粉", "スーマック", "sumac", "sommacco", "zumaque", "ground sumac");
c("konnyaku", "konjac", "魔芋", "こんにゃく", "konjac", "konjac", "konjac", "konnyaku|shirataki|konjac noodles|魔芋丝|しらたき|コンニャク");
c("mochi", "rice cakes", "年糕", "餅", "gâteaux de riz", "tortine di riso", "pasteles de arroz", "rice cake|mochi|plain mochi|round mochi|tteok|garaetteok|糍粑|もち|切り餅|丸餅|トック");
c("shiso", "shiso leaves", "紫苏", "大葉", "shiso", "shiso", "shiso", "shiso|perilla|perilla leaves|紫苏叶|しそ|青じそ|えごまの葉|sesame leaves");
c("passion-fruit", "passion fruit", "百香果", "パッションフルーツ", "fruit de la passion", "frutto della passione", "maracuyá", "passionfruit|maracuja");
c("papaya", "papaya", "木瓜", "パパイヤ", "papaye", "papaya", "papaya", "green papaya|ripe papaya|青木瓜|パパイア");
c("caramel", "dulce de leche", "牛奶焦糖酱", "ドゥルセ・デ・レチェ", "confiture de lait", "dulce de leche", "dulce de leche", "cajeta|caramel|caramel sauce|salted caramel|焦糖|焦糖酱|キャラメル|caramello|salsa de caramelo");

export const pantryConcepts: readonly Concept[] = concepts;

export function pantryNormalize(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("en")
    .replace(/[’'`]/g, "").replace(/[-_/]+/g, " ").replace(/\s+/g, " ").trim();
}

const cjk = /[぀-ヿ㐀-鿿豈-﫿]/u;
// Plural and spelling variants of the last word: tomato → tomatoes, berry → berries, leaf → leaves.
function variants(word: string): string[] {
  const parts = word.split(" ");
  const last = parts.pop()!;
  if (cjk.test(last)) return [word];
  const forms = new Set([last, `${last}s`, `${last}es`]);
  if (last.endsWith("y")) forms.add(`${last.slice(0, -1)}ies`);
  if (last.endsWith("f")) forms.add(`${last.slice(0, -1)}ves`);
  if (last.endsWith("s")) forms.add(last.slice(0, -1));
  return [...forms].map((form) => [...parts, form].join(" "));
}

// Written words win over generated plural forms ("peppers" is the vegetable, not plural "pepper").
const lookup = new Map<string, Concept>();
const cjkWords: Array<[string, Concept]> = [];
for (const concept of concepts) {
  for (const word of concept.words) {
    const normalized = pantryNormalize(word);
    if (!lookup.has(normalized)) lookup.set(normalized, concept);
    if (cjk.test(normalized)) cjkWords.push([normalized, concept]);
  }
}
for (const concept of concepts) {
  for (const word of concept.words) for (const form of variants(pantryNormalize(word))) if (!lookup.has(form)) lookup.set(form, concept);
}
cjkWords.sort((left, right) => right[0].length - left[0].length);
export const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));

// "1 tbsp garlic, minced (about 2 cloves)" → "garlic". Optional/garnish lines are flagged.
const units = /^(?:[\d⁄.,\s–-]+|a |an |about |approx |(?:tsp|tbsp|tablespoons?|teaspoons?|c|cups?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|litres?|liters?|cans?|tins?|jars?|bags?|packets?|pinch(?:es)?|dash(?:es)?|handfuls?|bunch(?:es)?|sprigs?|slices?|pieces?|stalks?|heads?|knobs?|sticks?)\b\.?\s*|of )+/;
export function cleanIngredient(name: string): { phrase: string; alternatives: string[]; optional: boolean } {
  let text = pantryNormalize(name);
  const optional = /\boptional\b|\bfor (?:garnish|garnishing|serving|decoration|decorating|dusting|greasing|brushing)\b|\bto (?:serve|garnish|decorate)\b/.test(text);
  text = text.replace(/^for [^:]*:\s*/, "").replace(/\([^)]*\)/g, " ").split(/[,;:]/)[0]!
    .replace(/\s(?:to taste|as needed|as required|plus more|for|to (?:serve|garnish|decorate))\b.*$/, "")
    .replace(/\s+/g, " ").trim();
  const alternatives = text.split(/\s+or\s+/).map((part) => part.replace(units, "").trim()).filter(Boolean);
  return { phrase: alternatives[0] ?? text, alternatives: alternatives.length ? alternatives : [text], optional };
}

// Longest concept word, preferring one that ends the phrase ("coconut milk" over "milk", "red pepper flakes" over "red pepper").
export function conceptFor(phrase: string): Concept | null {
  const text = pantryNormalize(phrase);
  if (!text) return null;
  if (cjk.test(text)) {
    for (const [word, concept] of cjkWords) if (text === word) return concept;
    for (const [word, concept] of cjkWords) if (text.includes(word)) return concept;
  }
  const tokens = text.split(" ");
  let best: Concept | null = null, bestScore = -1;
  for (let start = 0; start < tokens.length; start += 1) {
    for (let end = Math.min(tokens.length, start + 5); end > start; end -= 1) {
      const concept = lookup.get(tokens.slice(start, end).join(" "));
      if (!concept) continue;
      const score = (end === tokens.length ? 1000 : 0) + (end - start) * 10 + start;
      if (score > bestScore) { best = concept; bestScore = score; }
    }
  }
  return best;
}

export type PantryKey = { key: string; concept: Concept | null; phrase: string };
function keyOf(phrase: string): PantryKey {
  const concept = conceptFor(phrase);
  return { key: concept ? concept.id : `?${phrase}`, concept, phrase };
}

export type PantryRequirement = { name: string; options: PantryKey[] };
/** Required ingredient lines of one recipe, deduplicated by concept; basics and optional lines are left out. */
export function recipeRequirements(ingredients: readonly string[]): PantryRequirement[] {
  const seen = new Set<string>();
  const result: PantryRequirement[] = [];
  for (const name of ingredients) {
    const cleaned = cleanIngredient(name);
    if (cleaned.optional) continue;
    const options = cleaned.alternatives.map(keyOf);
    if (options.some((option) => option.concept?.basic) || !options[0]!.phrase) continue;
    const id = options.map((option) => option.key).sort().join("|");
    if (seen.has(id) || options.every((option) => seen.has(option.key))) continue;
    seen.add(id);
    for (const option of options) seen.add(option.key);
    result.push({ name, options });
  }
  return result;
}

export function readPantry(items: readonly string[]): PantryKey[] {
  const seen = new Set<string>();
  return items.map((item) => keyOf(cleanIngredient(item).phrase || pantryNormalize(item))).filter((entry) => entry.phrase && !seen.has(entry.key) && Boolean(seen.add(entry.key)));
}

export function conceptLabel(entry: PantryKey, locale: PantryLocale, original?: string): string {
  return entry.concept ? entry.concept.label[locale] : original ?? entry.phrase;
}

export type PantryOutcome = {
  have: PantryKey[];
  swaps: Array<{ need: PantryKey; use: PantryKey }>;
  missing: PantryRequirement[];
  total: number;
};

// An unknown typed word still matches a recipe line it ends ("kombu" ↔ "dried kombu").
function sameUnknown(owned: PantryKey, need: PantryKey) {
  if (owned.concept || need.concept) return false;
  const typed = owned.phrase.replace(/(?:es|s)$/, ""), line = need.phrase.replace(/(?:es|s)$/, "");
  return line === typed || line.endsWith(` ${typed}`);
}

export function matchRecipe(requirements: readonly PantryRequirement[], owned: readonly PantryKey[]): PantryOutcome {
  const keys = new Set(owned.map((entry) => entry.key));
  const outcome: PantryOutcome = { have: [], swaps: [], missing: [], total: requirements.length };
  for (const requirement of requirements) {
    const direct = requirement.options.find((option) => keys.has(option.key) || owned.some((entry) => sameUnknown(entry, option)));
    if (direct) { outcome.have.push(direct); continue; }
    let swap: { need: PantryKey; use: PantryKey } | null = null;
    for (const option of requirement.options) {
      const use = option.concept?.group ? owned.find((entry) => entry.concept?.group === option.concept!.group) : undefined;
      if (use) { swap = { need: option, use }; break; }
    }
    if (swap) outcome.swaps.push(swap);
    else outcome.missing.push(requirement);
  }
  return outcome;
}

/**
 * Best recipes first. Each ingredient of yours a recipe uses counts for it and each missing one counts
 * against it one and a half times, so a dish using four of your things and needing one more ranks above a
 * one-ingredient dish that happens to be complete. Ties: fewer missing, fewer swaps, fuller match.
 */
export function rankPantry<T extends { slug: string }>(recipes: ReadonlyArray<{ recipe: T; requirements: readonly PantryRequirement[] }>, owned: readonly PantryKey[], limit = 60) {
  if (!owned.length) return [];
  const scored: Array<{ recipe: T; outcome: PantryOutcome }> = [];
  for (const { recipe, requirements } of recipes) {
    if (!requirements.length) continue;
    const outcome = matchRecipe(requirements, owned);
    if (!outcome.have.length) continue;
    scored.push({ recipe, outcome });
  }
  const used = (outcome: PantryOutcome) => outcome.have.length + outcome.swaps.length;
  const score = (outcome: PantryOutcome) => used(outcome) - 1.5 * outcome.missing.length;
  scored.sort((left, right) => score(right.outcome) - score(left.outcome)
    || left.outcome.missing.length - right.outcome.missing.length
    || left.outcome.swaps.length - right.outcome.swaps.length
    || used(right.outcome) / right.outcome.total - used(left.outcome) / left.outcome.total);
  return scored.slice(0, limit);
}
