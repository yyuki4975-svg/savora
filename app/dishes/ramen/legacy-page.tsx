"use client";

import { useState } from "react";
import { dishes } from "../../data";
import { DishCard, Footer, Header } from "../../ui";

const baseIngredients = [
  [800, "ml", "chicken or vegetable stock"],
  [4, "tbsp", "Japanese soy sauce"],
  [2, "tbsp", "mirin"],
  [1, "tsp", "toasted sesame oil"],
  [2, "", "garlic cloves, finely grated"],
  [20, "g", "fresh ginger, sliced"],
  [320, "g", "fresh ramen noodles"],
  [200, "g", "chashu pork or roasted mushrooms"],
  [2, "", "soft-boiled eggs, halved"],
  [2, "sheets", "nori, plus scallions to serve"],
] as const;

const steps = [
  ["Build the aromatic broth", "Bring the stock, ginger, and garlic to a gentle simmer for 25 minutes. Keep the heat low so the broth stays clear, then strain."],
  ["Make the shoyu tare", "Combine soy sauce, mirin, and sesame oil. Warm for 2 minutes without boiling. Divide the tare between serving bowls."],
  ["Prepare the toppings", "Warm the chashu or mushrooms in a little broth. Slice scallions, halve the eggs, and cut each nori sheet in two."],
  ["Cook the noodles last", "Boil noodles according to their package timing—usually 2 to 3 minutes. Agitate them early, drain very well, and do not rinse."],
  ["Assemble without delay", "Ladle hot broth over the tare, stir once, then add noodles. Arrange toppings lightly and serve immediately."],
];

export default function RamenPage() {
  const dish = dishes[0];
  const [servings, setServings] = useState(1);
  const factor = servings / 2;

  return (
    <main className="paper-page">
      <Header />
      <article className="paper-recipe">
        <header className="paper-masthead">
          <div><span>Savora kitchen notes</span><small>Tokyo home edition</small></div>
          <p>Japan · Kantō · Modern home adaptation</p>
        </header>

        <section className="paper-title-block ramen-paper-title">
          <div>
            <div className="paper-origin-line"><span aria-hidden="true">{dish.flag}</span><strong>{dish.origin}</strong></div>
            <p className="paper-kicker">Clear broth · Soy tare · Springy noodles</p>
            <h1>Shoyu<br />Ramen</h1>
            <p className="paper-local-name">醤油ラーメン</p>
            <p className="paper-deck">A practical Tokyo-style bowl built around balance rather than heaviness.</p>
          </div>
          <img src={dish.image} alt="Shoyu ramen with egg, nori, pork, and scallions" />
        </section>

        <section className="paper-facts" aria-label="Recipe facts">
          <div><strong>80 min</strong><span>Total time</span></div>
          <div><strong>Medium</strong><span>Difficulty</span></div>
          <div><strong>$12</strong><span>Estimated cost</span></div>
          <div><strong>4.9 / 5</strong><span>2.8k ratings</span></div>
        </section>

        <section className="paper-story">
          <p className="paper-kicker">The short story</p>
          <h2>A Tokyo classic shaped by many hands</h2>
          <div>
            <p>Ramen developed in Japan through exchanges with Chinese noodle traditions, then evolved into strongly local styles. Shoyu ramen is especially associated with Tokyo: wheat noodles in a broth whose defining seasoning, or tare, is soy sauce.</p>
            <p>This is a modern home adaptation, not one definitive traditional formula. It shortens the stock-making process while keeping the contrast between clear broth, concentrated seasoning, springy noodles, and restrained toppings.</p>
          </div>
        </section>

        <section className="paper-body-grid">
          <aside className="paper-ingredients">
            <div className="paper-section-title"><span>List</span><h2>Ingredients</h2></div>
            <div className="paper-serving-control">
              <span>Serves</span>
              <div><button type="button" aria-label="Decrease servings" onClick={() => setServings((value) => Math.max(1, value - 1))}>−</button><strong>{servings}</strong><button type="button" aria-label="Increase servings" onClick={() => setServings((value) => Math.min(8, value + 1))}>+</button></div>
            </div>
            <ul>
              {baseIngredients.map(([amount, unit, ingredient]) => {
                const scaled = Number.isInteger(amount * factor) ? amount * factor : (amount * factor).toFixed(1);
                return <li key={ingredient}><strong>{scaled} {unit}</strong><span>{ingredient}</span></li>;
              })}
            </ul>
            <div className="paper-note"><strong>Dietary notes</strong><p>Dairy-free. Contains soy and gluten. Use roasted mushrooms and vegetable stock for a vegetarian variation.</p></div>
          </aside>

          <section className="paper-method">
            <div className="paper-section-title"><span>Guide</span><h2>Method</h2></div>
            <ol>{steps.map(([title, description], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol>
            <div className="paper-chef-note"><strong>Cook’s note</strong><p>Taste broth and tare together before seasoning further. If the bowl tastes flat, add tare by the teaspoon—not straight soy sauce.</p></div>
          </section>
        </section>

        <footer className="paper-source-line">
          <span>Cultural note: origins are layered and sometimes debated.</span>
          <a href="https://www.raumen.co.jp/english/" target="_blank" rel="noreferrer">Yokohama Ramen Museum ↗</a>
        </footer>
      </article>

      <section className="related-section section-shell">
        <div className="section-heading"><div><span className="kicker"><i /> Keep exploring</span><h2>More from East Asia</h2></div></div>
        <div className="dish-grid">{[dishes[5], dishes[10], dishes[11], dishes[9]].map((item) => <DishCard key={item.slug} dish={item} />)}</div>
      </section>
      <Footer />
    </main>
  );
}
