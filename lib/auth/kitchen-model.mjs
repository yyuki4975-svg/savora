// Small, deterministic state transitions shared by kitchen UI and regression tests.
export const kitchenDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export const kitchenMeals = ['Breakfast','Lunch','Dinner'];
export function planRecipe(content, slug, day, meal) {
  if (!kitchenDays.includes(day) || !kitchenMeals.includes(meal)) throw new Error('Choose a day and meal.');
  const key = `${day}-${meal}`;
  if (content.mealPlan[key] && content.mealPlan[key] !== slug) throw new Error('This slot already has a recipe. Change it in the meal planner first.');
  return {...content.mealPlan, [key]:slug};
}
export function cookProgress(sessions, slug, step, completed, stepCount) {
  if (!Number.isInteger(step) || step < 0 || step >= stepCount) throw new Error('Invalid cooking step.');
  if (!sessions.some(s => s.recipeSlug === slug) && sessions.length >= 50) throw new Error('Remove an old cooking session before saving another.');
  return [...sessions.filter(s => s.recipeSlug !== slug), {recipeSlug:slug,step,completed}];
}
export function collectionRecipes(collections, name, slug, add) {
  return collections.map(c => c.name !== name ? c : {...c,recipes:add ? [...new Set([...c.recipes,slug])] : c.recipes.filter(s => s !== slug)});
}
export function guestStatuses(storage) {
  const value = JSON.parse(storage.getItem('savora-recipe-status') ?? '{}');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid device kitchen.');
  return Object.fromEntries(Object.entries(value).filter(([slug,status]) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 120 && ['Want to cook','Cooking','Cooked','Favorite'].includes(status)).slice(0,1250));
}
