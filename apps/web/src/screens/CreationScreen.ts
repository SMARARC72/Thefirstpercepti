import gsap from "gsap";
import type { AppState, CreationState, CreationStepIndex, Option } from "../game";
import {
  CREATION_STEPS,
  DOMAIN_OPTIONS,
  FORM_OPTIONS,
  POSTURE_OPTIONS,
  SENSE_OPTIONS,
  validateCreationStep,
} from "../game";

interface CreationScreenProps {
  state: AppState;
  onExit: () => void;
  onUpdate: (creation: AppState["creation"]) => void;
  onComplete: () => void;
}

const STEP_TINTS: Record<number, string> = {
  0: "rgba(102, 224, 194, 0.03)",
  1: "rgba(159, 183, 255, 0.03)",
  2: "rgba(245, 217, 130, 0.03)",
  3: "rgba(255, 107, 107, 0.03)",
  4: "rgba(125, 216, 125, 0.03)",
  5: "rgba(201, 160, 220, 0.03)",
};

export class CreationScreen {
  private props: CreationScreenProps;
  private element: HTMLElement | null = null;
  private form: HTMLFormElement | null = null;

  constructor(props: CreationScreenProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const main = document.createElement("main");
    main.className = "creation-screen";
    main.style.background = STEP_TINTS[this.props.state.creation.step] ?? "transparent";
    main.setAttribute("aria-labelledby", "creation-heading");

    const header = document.createElement("header");
    header.className = "creation-header";

    const exitBtn = document.createElement("button");
    exitBtn.type = "button";
    exitBtn.className = "plain-action";
    exitBtn.textContent = "Title";
    exitBtn.addEventListener("click", () => this.props.onExit());

    const titleGroup = document.createElement("div");
    const stepLabel = document.createElement("p");
    stepLabel.className = "eyebrow";
    stepLabel.textContent = `Step ${this.props.state.creation.step + 1} of ${CREATION_STEPS.length}`;
    const h1 = document.createElement("h1");
    h1.id = "creation-heading";
    h1.textContent = CREATION_STEPS[this.props.state.creation.step];
    titleGroup.appendChild(stepLabel);
    titleGroup.appendChild(h1);

    header.appendChild(exitBtn);
    header.appendChild(titleGroup);
    main.appendChild(header);

    const stepper = document.createElement("ol");
    stepper.className = "stepper";
    stepper.setAttribute("aria-label", "Character creation progress");
    for (let i = 0; i < CREATION_STEPS.length; i++) {
      const li = document.createElement("li");
      const isCurrent = i === this.props.state.creation.step;
      const isDone = i < this.props.state.creation.step;
      li.className = isCurrent ? "current" : isDone ? "done" : "";
      const num = document.createElement("span");
      num.textContent = String(i + 1);
      const label = document.createElement("strong");
      label.textContent = CREATION_STEPS[i];
      li.appendChild(num);
      li.appendChild(label);
      stepper.appendChild(li);
    }
    main.appendChild(stepper);

    const layout = document.createElement("div");
    layout.className = "creation-layout";

    const form = document.createElement("form");
    form.className = "creation-panel";
    form.id = "creation-form";
    form.appendChild(this.renderStep());

    const controls = document.createElement("div");
    controls.className = "creation-controls";
    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.id = "creation-back";
    backBtn.textContent = "Back";
    backBtn.disabled = this.props.state.creation.step === 0;
    backBtn.addEventListener("click", () => this.goBack());

    const isLastStep = this.props.state.creation.step === CREATION_STEPS.length - 1;
    const nextBtn = document.createElement("button");
    nextBtn.type = "submit";
    nextBtn.className = "primary-action";
    nextBtn.id = "creation-next";
    nextBtn.textContent = isLastStep ? "Enter The World" : "Continue";

    controls.appendChild(backBtn);
    controls.appendChild(nextBtn);
    form.appendChild(controls);

    const feedback = document.createElement("p");
    feedback.className = "screen-feedback";
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    const error = validateCreationStep(this.props.state.creation);
    feedback.textContent = this.props.state.feedback || error || "Your answers shape the starting world.";
    if (error) feedback.classList.add("warning");
    form.appendChild(feedback);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    layout.appendChild(form);

    // Live preview sidebar (desktop)
    const preview = document.createElement("aside");
    preview.className = "creation-preview";
    preview.setAttribute("aria-label", "Character preview");
    preview.appendChild(this.buildPreview());
    layout.appendChild(preview);

    main.appendChild(layout);
    this.element = main;
    this.form = form;

    // Animate form content
    if (document.documentElement.dataset.reducedMotion !== "true") {
      gsap.fromTo(form.children, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: "power2.out" });
    }

    return main;
  }

  private renderStep(): HTMLElement {
    const c = this.props.state.creation;
    const step = c.step;
    const wrapper = document.createElement("div");
    wrapper.className = "creation-step-content";

    switch (step) {
      case 0: {
        const stack = document.createElement("div");
        stack.className = "field-stack";
        const label = document.createElement("label");
        label.htmlFor = "creation-name";
        label.textContent = "What name survives first contact?";
        const input = document.createElement("input");
        input.id = "creation-name";
        input.name = "name";
        input.type = "text";
        input.autocomplete = "name";
        input.maxLength = 50;
        input.value = c.name;
        input.addEventListener("input", () => this.readInputs());
        stack.appendChild(label);
        stack.appendChild(input);
        wrapper.appendChild(stack);
        break;
      }
      case 1: {
        const fieldset = document.createElement("fieldset");
        fieldset.className = "choice-grid";
        const legend = document.createElement("legend");
        legend.textContent = "Choose the body the world must answer.";
        fieldset.appendChild(legend);
        for (const opt of FORM_OPTIONS) {
          fieldset.appendChild(this.renderRadio("form", opt, c.form === opt.value));
        }
        wrapper.appendChild(fieldset);

        const descStack = document.createElement("div");
        descStack.className = "field-stack";
        const descLabel = document.createElement("label");
        descLabel.htmlFor = "form-description";
        descLabel.textContent = "Optional mark, scar, omen, or visible tell";
        const descArea = document.createElement("textarea");
        descArea.id = "form-description";
        descArea.rows = 3;
        descArea.value = c.formDescription;
        descArea.addEventListener("input", () => this.readInputs());
        descStack.appendChild(descLabel);
        descStack.appendChild(descArea);
        wrapper.appendChild(descStack);
        break;
      }
      case 2: {
        const perStack = document.createElement("div");
        perStack.className = "field-stack";
        const perLabel = document.createElement("label");
        perLabel.htmlFor = "first-perception";
        perLabel.textContent = "What did you perceive first?";
        const perArea = document.createElement("textarea");
        perArea.id = "first-perception";
        perArea.rows = 5;
        perArea.value = c.perception;
        perArea.addEventListener("input", () => this.readInputs());
        perStack.appendChild(perLabel);
        perStack.appendChild(perArea);
        wrapper.appendChild(perStack);

        const senseStack = document.createElement("div");
        senseStack.className = "field-stack compact";
        const senseLabel = document.createElement("label");
        senseLabel.htmlFor = "dominant-sense";
        senseLabel.textContent = "Dominant sense";
        const senseSelect = document.createElement("select");
        senseSelect.id = "dominant-sense";
        for (const sense of SENSE_OPTIONS) {
          const opt = document.createElement("option");
          opt.value = sense;
          opt.textContent = sense.charAt(0).toUpperCase() + sense.slice(1);
          if (c.dominantSense === sense) opt.selected = true;
          senseSelect.appendChild(opt);
        }
        senseSelect.addEventListener("change", () => this.readInputs());
        senseStack.appendChild(senseLabel);
        senseStack.appendChild(senseSelect);
        wrapper.appendChild(senseStack);
        break;
      }
      case 3: {
        const capStack = document.createElement("div");
        capStack.className = "field-stack";
        const capLabel = document.createElement("label");
        capLabel.htmlFor = "capability-claim";
        capLabel.textContent = "What can you do when the world turns hostile?";
        const capArea = document.createElement("textarea");
        capArea.id = "capability-claim";
        capArea.rows = 4;
        capArea.value = c.capabilityClaim;
        capArea.addEventListener("input", () => this.readInputs());
        capStack.appendChild(capLabel);
        capStack.appendChild(capArea);
        wrapper.appendChild(capStack);

        const domainStack = document.createElement("div");
        domainStack.className = "field-stack compact";
        const domainLabel = document.createElement("label");
        domainLabel.htmlFor = "primary-domain";
        domainLabel.textContent = "Primary domain";
        const domainSelect = document.createElement("select");
        domainSelect.id = "primary-domain";
        const blankOpt = document.createElement("option");
        blankOpt.value = "";
        blankOpt.textContent = "Choose a domain";
        domainSelect.appendChild(blankOpt);
        for (const opt of DOMAIN_OPTIONS) {
          const o = document.createElement("option");
          o.value = opt.value;
          o.textContent = opt.label;
          if (c.primaryDomain === opt.value) o.selected = true;
          domainSelect.appendChild(o);
        }
        domainSelect.addEventListener("change", () => this.readInputs());
        domainStack.appendChild(domainLabel);
        domainStack.appendChild(domainSelect);
        wrapper.appendChild(domainStack);
        break;
      }
      case 4: {
        const fieldset = document.createElement("fieldset");
        fieldset.className = "choice-grid";
        const legend = document.createElement("legend");
        legend.textContent = "How do you hold dangerous knowledge?";
        fieldset.appendChild(legend);
        for (const opt of POSTURE_OPTIONS) {
          fieldset.appendChild(this.renderRadio("posture", opt, c.posture === opt.value));
        }
        wrapper.appendChild(fieldset);

        const descStack = document.createElement("div");
        descStack.className = "field-stack";
        const descLabel = document.createElement("label");
        descLabel.htmlFor = "posture-description";
        descLabel.textContent = "Optional vow, rule, or contradiction";
        const descArea = document.createElement("textarea");
        descArea.id = "posture-description";
        descArea.rows = 3;
        descArea.value = c.postureDescription;
        descArea.addEventListener("input", () => this.readInputs());
        descStack.appendChild(descLabel);
        descStack.appendChild(descArea);
        wrapper.appendChild(descStack);
        break;
      }
      case 5: {
        const detailsStack = document.createElement("div");
        detailsStack.className = "field-stack";
        const detailsLabel = document.createElement("label");
        detailsLabel.htmlFor = "optional-details";
        detailsLabel.textContent = "Optional truths the world may use later";
        const detailsArea = document.createElement("textarea");
        detailsArea.id = "optional-details";
        detailsArea.rows = 4;
        detailsArea.value = c.optionalDetails;
        detailsArea.addEventListener("input", () => this.readInputs());
        detailsStack.appendChild(detailsLabel);
        detailsStack.appendChild(detailsArea);
        wrapper.appendChild(detailsStack);

        const inline = document.createElement("div");
        inline.className = "inline-fields";
        for (const [id, label] of [
          ["desired-item", "Desired item"],
          ["fear", "Fear"],
          ["left-behind", "Left behind"],
        ] as const) {
          const lbl = document.createElement("label");
          const txt = document.createElement("span");
          txt.textContent = label;
          const inp = document.createElement("input");
          inp.id = id;
          inp.type = "text";
          const key = id.replace(/-/g, "") as keyof typeof c;
          inp.value = (c[key] as string) ?? "";
          inp.addEventListener("input", () => this.readInputs());
          lbl.appendChild(txt);
          lbl.appendChild(inp);
          inline.appendChild(lbl);
        }
        wrapper.appendChild(inline);
        break;
      }
    }

    return wrapper;
  }

  private renderRadio<T extends string>(name: string, option: Option<T>, checked: boolean): HTMLElement {
    const label = document.createElement("label");
    label.className = `choice-card ${checked ? "selected" : ""}`;
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = option.value;
    if (checked) input.checked = true;
    input.addEventListener("change", () => {
      this.readInputs();
      const cards = this.element?.querySelectorAll(`.choice-card input[name="${name}"]`);
      cards?.forEach((c) => {
        const card = (c as HTMLInputElement).closest(".choice-card");
        if (card) card.classList.toggle("selected", (c as HTMLInputElement).checked);
      });
    });
    const span = document.createElement("span");
    span.textContent = option.label;
    const small = document.createElement("small");
    small.textContent = option.description;
    label.appendChild(input);
    label.appendChild(span);
    label.appendChild(small);
    return label;
  }

  private buildPreview(): HTMLElement {
    const c = this.props.state.creation;
    const div = document.createElement("div");
    div.className = "preview-card";

    const h3 = document.createElement("h3");
    h3.textContent = "Character Preview";
    div.appendChild(h3);

    const fields: [string, string][] = [
      ["Name", c.name || "\u2014"],
      ["Form", c.form ? (FORM_OPTIONS.find((o) => o.value === c.form)?.label ?? c.form) : "\u2014"],
      ["Perception", c.perception || "\u2014"],
      ["Sense", c.dominantSense],
      ["Capability", c.capabilityClaim || "\u2014"],
      ["Domain", c.primaryDomain ? (DOMAIN_OPTIONS.find((o) => o.value === c.primaryDomain)?.label ?? c.primaryDomain) : "\u2014"],
      ["Posture", c.posture ? (POSTURE_OPTIONS.find((o) => o.value === c.posture)?.label ?? c.posture) : "\u2014"],
    ];

    for (const [label, value] of fields) {
      const row = document.createElement("div");
      row.className = "preview-row";
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      row.appendChild(dt);
      row.appendChild(dd);
      div.appendChild(row);
    }

    return div;
  }

  private readInputs(): CreationState {
    const form = this.form;
    const next = { ...this.props.state.creation };
    if (form) {
      const getVal = (id: string) => (form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`)?.value ?? "");
      const getRadio = (name: string) => form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? "";

      next.name = getVal("creation-name");
      next.form = getRadio("form") as typeof next.form;
      next.formDescription = getVal("form-description");
      next.perception = getVal("first-perception");
      next.dominantSense = getVal("dominant-sense") || next.dominantSense;
      next.capabilityClaim = getVal("capability-claim");
      next.primaryDomain = getVal("primary-domain") as typeof next.primaryDomain;
      next.posture = getRadio("posture") as typeof next.posture;
      next.postureDescription = getVal("posture-description");
      next.optionalDetails = getVal("optional-details");
      next.desiredItem = getVal("desired-item");
      next.fear = getVal("fear");
      next.leftBehind = getVal("left-behind");

      this.props.onUpdate(next);

      // Update preview
      const preview = this.element?.querySelector(".creation-preview");
      if (preview) {
        preview.innerHTML = "";
        preview.appendChild(this.buildPreview());
      }
    }
    return next;
  }

  private goBack(): void {
    const step = Math.max(0, this.props.state.creation.step - 1) as CreationStepIndex;
    this.props.onUpdate({ ...this.props.state.creation, step });
  }

  private handleSubmit(): void {
    const creation = this.readInputs();
    const error = validateCreationStep(creation);
    if (error) {
      const feedback = this.element?.querySelector(".screen-feedback");
      if (feedback) {
        feedback.textContent = error;
        feedback.classList.add("warning");
      }
      return;
    }

    if (creation.step < CREATION_STEPS.length - 1) {
      const step = (creation.step + 1) as CreationStepIndex;
      this.props.onUpdate({ ...creation, step });
      return;
    }

    // EMBARK - cinematic transition
    if (this.element && document.documentElement.dataset.reducedMotion !== "true") {
      gsap.to(this.element, {
        opacity: 0,
        scale: 0.98,
        duration: 0.6,
        ease: "power2.in",
        onComplete: () => this.props.onComplete(),
      });
    } else {
      this.props.onComplete();
    }
  }

  destroy(): void {
    this.element = null;
    this.form = null;
  }
}
