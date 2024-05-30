import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";

import { customElement, property } from "lit/decorators.js";
import { Ref, createRef, ref } from "lit/directives/ref.js";

import { core } from "../core/core";
import { styles } from "./dialog.scss";

/** Dialog component. */
@customElement("pr-dialog")
export class Dialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() showDialog = false;

  dialogRef: Ref<Element> = createRef();

  override updated() {
    if (this.showDialog) {
      this.openDialog();
    } else {
      this.closeDialog();
    }
  }

  openDialog() {
    if (this.dialogRef?.value) {
      (this.dialogRef.value as HTMLDialogElement).showModal();
    }
  }

  closeDialog() {
    if (this.dialogRef?.value) {
      (this.dialogRef.value as HTMLDialogElement).close();
    }
  }

  override render() {
    return html`
      <dialog ${ref(this.dialogRef)}>
        <slot></slot>
      </dialog>
    `;
  }
}

declare global {
  interface HtmlElementTagNameMap {
    "pr-dialog": Dialog;
  }
}
