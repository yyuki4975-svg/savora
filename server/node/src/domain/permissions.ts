import { ProductError } from "./product-error";
export type Capability = "PrivateKitchen" | "Contribute" | "ReviewRecipe" | "ModerateCommunity" | "ManageRoles";
const grants: Readonly<Record<string, readonly Capability[]>> = {
  User: ["PrivateKitchen", "Contribute"], Contributor: ["PrivateKitchen", "Contribute"],
  Editor: ["PrivateKitchen", "Contribute", "ReviewRecipe"],
  Moderator: ["PrivateKitchen", "Contribute", "ModerateCommunity"],
  Admin: ["PrivateKitchen", "Contribute", "ReviewRecipe", "ModerateCommunity", "ManageRoles"],
};
export function requireCapability(role: string, capability: Capability): void {
  if (!Object.hasOwn(grants, role) || !grants[role]!.includes(capability)) {
    throw new ProductError(403, "Forbidden", "This action is not permitted.");
  }
}
