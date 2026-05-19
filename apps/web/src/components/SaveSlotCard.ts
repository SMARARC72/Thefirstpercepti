interface SaveSlot {
  id: string;
  name: string;
  turnCount: number;
  characterName: string;
  updatedAt: string;
}

interface SaveSlotCardProps {
  slot: SaveSlot;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

export class SaveSlotCard {
  private props: SaveSlotCardProps;
  private element: HTMLElement | null = null;

  constructor(props: SaveSlotCardProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const card = document.createElement("article");
    card.className = "save-slot-card";

    const header = document.createElement("div");
    header.className = "save-slot-header";

    const name = document.createElement("h3");
    name.textContent = this.props.slot.name || `Slot ${this.props.slot.id}`;

    const meta = document.createElement("span");
    meta.className = "save-slot-meta";
    const date = new Date(this.props.slot.updatedAt);
    meta.textContent = `${this.props.slot.characterName} · Turn ${this.props.slot.turnCount} · ${date.toLocaleDateString()}`;

    header.appendChild(name);
    header.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "save-slot-actions";

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "primary-action";
    loadBtn.textContent = "Load";
    loadBtn.addEventListener("click", () => this.props.onLoad(this.props.slot.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => this.props.onDelete(this.props.slot.id));

    actions.appendChild(loadBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(actions);

    this.element = card;
    return card;
  }

  destroy(): void {
    this.element = null;
  }
}
