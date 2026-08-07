import { Okalit, defineElement, signal, html } from "@okalit/core";

import styles from "./okalit-demo-components.css?inline";

@defineElement({
  tag: "okalit-demo-components",
  styles: [styles],
  props: [
    {
      components: {
        type: Array,
        value: []
      }
    },
  ],
})
export class OkalitDemoComponents extends Okalit {

  resolutions = signal("mobile");
  deviceTheme = signal("light");
  currentComponent = signal(null);
  currentTab = signal("props");
  componentLoaded = signal(false);
  propValues = signal({});
  slotValues = signal({});
  toasts = signal([]);
  _eventCleanups = [];

  _initPropValues(comp) {
    const values = {};
    for (const propDef of comp.props) {
      const [name, config] = Object.entries(propDef)[0];
      values[name] = config.value;
    }
    this.propValues.value = values;

    const slots = {};
    for (const slot of (comp.slots || [])) {
      slots[slot.name] = slot.content || '';
    }
    this.slotValues.value = slots;
  }

  _updatePropValue(name, value) {
    this.propValues.value = { ...this.propValues.value, [name]: value };
  }

  _updateSlotValue(name, value) {
    this.slotValues.value = { ...this.slotValues.value, [name]: value };
  }

  _showToast(eventName, detail) {
    const toast = {
      id: Date.now(),
      eventName,
      detail: detail !== undefined ? JSON.stringify(detail, null, 2) : 'void',
    };

    this.toasts.value = [...this.toasts.value, toast];

    setTimeout(() => {
      this.toasts.value = this.toasts.value.filter(t => t.id !== toast.id);
    }, 4000);
  }

  _attachEventListeners(el, comp) {
    this._cleanupEventListeners();

    for (const eventName of (comp.events || [])) {
      const handler = (e) => this._showToast(eventName, e.detail);
      el.addEventListener(eventName, handler);
      this._eventCleanups.push(() => el.removeEventListener(eventName, handler));
    }
  }

  _cleanupEventListeners() {
    for (const cleanup of this._eventCleanups) cleanup();
    this._eventCleanups = [];
  }

  setComponents(components) {
    this.components.value = components;
  }

  onInit() {
    if (this.components.value.length > 0) {
      this._selectComponent(this.components.value[0]);
    }
  }

  onChange(changes) {
    if (changes.components && this.components.value.length > 0 && !this.currentComponent.value) {
      this._selectComponent(this.components.value[0]);
    }
  }

  async _selectComponent(component) {
    this.componentLoaded.value = false;
    this.currentComponent.value = component;
    this._initPropValues(component);

    if (typeof component.import === 'function') {
      await component.import();
    } else if (component.import) {
      await component.import;
    }

    this.componentLoaded.value = true;
  }

  get _componentSelector() {
    if (this.components.value.length <= 1) {
      return html`<h1>${this.currentComponent.value?.name}</h1>`;
    }

    return html`
      <select class="component-select" @change="${(e) => {
        const selected = this.components.value[e.target.selectedIndex];
        this._selectComponent(selected);
      }}">
        ${this.components.value.map(comp => html`
          <option ?selected="${comp.tag === this.currentComponent.value?.tag}">${comp.name}</option>
        `)}
      </select>
    `;
  }

  get _deviceContent() {
    if (!this.currentComponent.value || !this.componentLoaded.value) {
      return html`<span class="loading">Loading...</span>`;
    }

    const comp = this.currentComponent.value;
    const el = document.createElement(comp.tag);

    for (const [name, value] of Object.entries(this.propValues.value)) {
      if (typeof value === 'boolean') {
        if (value) el.setAttribute(name, '');
      } else {
        el.setAttribute(name, value);
      }
    }

    for (const [name, content] of Object.entries(this.slotValues.value)) {
      if (!content) continue;
      const wrapper = document.createElement('span');
      wrapper.innerHTML = content;
      if (name !== 'default') wrapper.setAttribute('slot', name);
      el.appendChild(wrapper);
    }

    this._attachEventListeners(el, comp);

    return html`${el}`;
  }

  get _toasts() {
    return html`
      <div class="toast-container">
        ${this.toasts.value.map(toast => html`
          <div class="toast">
            <span class="toast-event">${toast.eventName}</span>
            <pre class="toast-detail">${toast.detail}</pre>
          </div>
        `)}
      </div>
    `;
  }

  get _buttonsResolution() {
    return html`
      <button class="${this.resolutions.value === 'mobile' ? 'active' : ''}" @click="${() => this.resolutions.value = 'mobile'}">Mobile</button>
      <button class="${this.resolutions.value === 'tablet' ? 'active' : ''}" @click="${() => this.resolutions.value = 'tablet'}">Tablet</button>
      <button class="${this.resolutions.value === 'fullscreen' ? 'active' : ''}" @click="${() => this.resolutions.value = 'fullscreen'}">FullScreen</button>
      <span class="separator"></span>
      <button class="${this.deviceTheme.value === 'light' ? 'active' : ''}" @click="${() => this.deviceTheme.value = 'light'}">☀️ Light</button>
      <button class="${this.deviceTheme.value === 'dark' ? 'active' : ''}" @click="${() => this.deviceTheme.value = 'dark'}">🌙 Dark</button>
    `;
  }

  get _tabsDetail() {
    return html`
      <div class="tabs">
        <button @click="${() => this.currentTab.value = 'props'}">Props</button>
        <button @click="${() => this.currentTab.value = 'slots'}">Slots</button>
        <button @click="${() => this.currentTab.value = 'events'}">Events</button>
        <button @click="${() => this.currentTab.value = 'channels'}">Channels</button>
        <button @click="${() => this.currentTab.value = 'example'}">Example</button>
      </div>
    `;
  }

  _renderPropInput(name, config) {
    const currentValue = this.propValues.value[name];

    if (config.type === Boolean) {
      return html`<input type="checkbox" ?checked="${currentValue}" @change="${(e) => this._updatePropValue(name, e.target.checked)}" />`;
    }
    if (config.type === Number) {
      return html`<input type="number" .value="${currentValue}" @input="${(e) => this._updatePropValue(name, Number(e.target.value))}" />`;
    }
    return html`<input type="text" .value="${currentValue ?? ''}" @input="${(e) => this._updatePropValue(name, e.target.value)}" />`;
  }

  get _getDetailProps() {
    return html`
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Type</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          ${this.currentComponent.value.props.map(prop => {
            const [name, config] = Object.entries(prop)[0];
            return html`
              <tr>
                <td class="row">${name}</td>
                <td class="row">${config.type.name}</td>
                <td class="row">${this._renderPropInput(name, config)}</td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    `;
  }

  get _getDetailEvents() {
    return html`
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
          </tr>
        </thead>
        <tbody>
          ${this.currentComponent.value.events.map(event => html`
            <tr>
              <th scope="row">${event}</th>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  get _getDetailChannels() {
    return html`
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
          </tr>
        </thead>
        <tbody>
          ${this.currentComponent.value.channels.map(channel => html`
            <tr>
              <th scope="row">${channel}</th>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  get _getDetailSlots() {
    const slots = this.currentComponent.value.slots || [];
    if (!slots.length) return html`<p>No slots defined</p>`;

    return html`
      <table>
        <thead>
          <tr>
            <th scope="col">Slot</th>
            <th scope="col">Content</th>
          </tr>
        </thead>
        <tbody>
          ${slots.map(slot => html`
            <tr>
              <td class="row">${slot.name}</td>
              <td class="row">
                <textarea
                  class="slot-input"
                  .value="${this.slotValues.value[slot.name] || ''}"
                  @input="${(e) => this._updateSlotValue(slot.name, e.target.value)}"
                  rows="3"
                ></textarea>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  get _getDetailExample() {
    const comp = this.currentComponent.value;
    const attrs = comp.props.map(prop => {
      const [name, config] = Object.entries(prop)[0];
      return `  ${name}="${config.value}"`;
    });
    const events = (comp.events || []).map(ev => `  @${ev}="\${handler}"`);
    const lines = [...attrs, ...events];

    const slotContent = (comp.slots || []).map(slot => {
      if (slot.name === 'default') return `  ${slot.content}`;
      return `  <span slot="${slot.name}">${slot.content}</span>`;
    }).join('\n');

    let code = `<${comp.tag}`;
    if (lines.length) code += `\n${lines.join('\n')}\n`;
    code += `>`;
    if (slotContent) code += `\n${slotContent}\n`;
    code += `</${comp.tag}>`;

    return html`
      <pre class="code-example"><code>${code}</code></pre>
    `;
  }

  get _getDetailDoc() {
    if (!this.currentComponent.value) return '';
    return html`
      ${this.currentTab.value === 'props' ? this._getDetailProps : ''}
      ${this.currentTab.value === 'slots' ? this._getDetailSlots : ''}
      ${this.currentTab.value === 'events' ? this._getDetailEvents : ''}
      ${this.currentTab.value === 'channels' ? this._getDetailChannels : ''}
      ${this.currentTab.value === 'example' ? this._getDetailExample : ''}
    `;
  }

  get _details() {
    return html`
      <section class="details">
        ${this.currentComponent.value ? html`
          <div>
            ${this._componentSelector}
            <p>${this.currentComponent.value.description}</p>
          </div>
        `: html`<p>No components found</p>`}
        
        <div>
          ${this._tabsDetail}
          ${this._getDetailDoc}
        </div>
      </section>
    `;
  }

  render() {
    return html`
      <main class="demo-components-okalit">
        <section class="content">
          <div class="resolution">
            ${this._buttonsResolution}
          </div>
          <div class="device ${this.resolutions.value} ${this.deviceTheme.value === 'dark' ? 'device-dark' : ''}">
            ${this._deviceContent}
          </div>
        </section>

        ${this.resolutions.value !== 'fullscreen' ? this._details : ''}
      </main>
      ${this._toasts}
    `;
  }
}
