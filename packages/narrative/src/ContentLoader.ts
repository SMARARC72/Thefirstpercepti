export class ContentLoader {
  private static readonly basePath = "/content/_compiled";

  static async loadAll(): Promise<Record<string, Record<string, unknown>>> {
    const stories = [
      "main",
      "arrival",
      "fountain",
      "archive",
      "combat",
      "dialogue",
      "faction_reactions",
      "consequences",
      "legacy",
    ];
    const result: Record<string, Record<string, unknown>> = {};
    await Promise.all(
      stories.map(async (name) => {
        try {
          result[name] = await ContentLoader.loadStory(name);
        } catch (err) {
          console.warn(`Failed to load story ${name}:`, err);
        }
      })
    );
    return result;
  }

  static async loadStory(name: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${ContentLoader.basePath}/${name}.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch story ${name}: ${response.status} ${response.statusText}`);
    }
    const raw = await response.text();
    // Strip BOM if present (inkjs-compiler emits UTF-8 BOM)
    const cleaned = raw.replace(/^\uFEFF/, "");
    return JSON.parse(cleaned) as Record<string, unknown>;
  }
}
