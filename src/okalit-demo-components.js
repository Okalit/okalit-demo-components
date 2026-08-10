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
  deviceTheme = signal("dark");
  currentComponent = signal(null);
  currentTab = signal("props");
  componentLoaded = signal(false);
  propValues = signal({});
  slotValues = signal({});
  consoleLogs = signal([]);
  _eventCleanups = [];
  _previewEl = null;
  _previewTag = null;

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

  _logToConsole(type, name, detail) {
    const entry = {
      id: Date.now() + Math.random(),
      type,
      name,
      detail: detail !== undefined ? JSON.stringify(detail, null, 2) : undefined,
      time: new Date().toLocaleTimeString(),
    };
    this.consoleLogs.value = [...this.consoleLogs.value, entry];
  }

  _attachEventListeners(el, comp) {
    this._cleanupEventListeners();

    for (const eventName of (comp.events || [])) {
      const handler = (e) => {
        this._logToConsole('event', eventName, e.detail);
        if (e.detail && typeof e.detail === 'object') {
          for (const [key, val] of Object.entries(e.detail)) {
            if (key in this.propValues.value) {
              this._updatePropValue(key, val);
            }
          }
        }
      };
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
    this._previewEl = null;
    this._previewTag = null;
    this._cleanupEventListeners();
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

    if (!this._previewEl || this._previewTag !== comp.tag) {
      this._previewEl = document.createElement(comp.tag);
      this._previewTag = comp.tag;
      this._attachEventListeners(this._previewEl, comp);
    }

    const el = this._previewEl;

    // Sync attributes/properties
    for (const [name, value] of Object.entries(this.propValues.value)) {
      if (typeof value === 'boolean') {
        if (value) el.setAttribute(name, '');
        else el.removeAttribute(name);
      } else if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
        el[name] = value;
      } else {
        el.setAttribute(name, value);
      }
    }

    // Sync slots
    el.innerHTML = '';
    for (const [name, content] of Object.entries(this.slotValues.value)) {
      if (!content) continue;
      const wrapper = document.createElement('span');
      wrapper.innerHTML = content;
      if (name !== 'default') wrapper.setAttribute('slot', name);
      el.appendChild(wrapper);
    }

    return html`${el}`;
  }

  get _getDetailConsole() {
    const logs = this.consoleLogs.value;
    return html`
      <div class="console-panel">
        <div class="console-toolbar">
          <button class="console-clear" @click="${() => { this.consoleLogs.value = []; }}">Clear</button>
        </div>
        <div class="console-logs">
          ${logs.length === 0 ? html`<span class="console-empty">No events logged yet. Interact with the component to see events here.</span>` : ''}
          ${logs.map(entry => html`
            <div class="console-entry">
              <span class="console-time">${entry.time}</span>
              <span class="console-type console-type--${entry.type}">${entry.type}</span>
              <span class="console-name">${entry.name}</span>
              ${entry.detail ? html`<pre class="console-detail">${entry.detail}</pre>` : ''}
            </div>
          `)}
        </div>
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
        <button class="${this.currentTab.value === 'props' ? 'active' : ''}" @click="${() => this.currentTab.value = 'props'}">Props</button>
        <button class="${this.currentTab.value === 'slots' ? 'active' : ''}" @click="${() => this.currentTab.value = 'slots'}">Slots</button>
        <button class="${this.currentTab.value === 'events' ? 'active' : ''}" @click="${() => this.currentTab.value = 'events'}">Events</button>
        <button class="${this.currentTab.value === 'channels' ? 'active' : ''}" @click="${() => this.currentTab.value = 'channels'}">Channels</button>
        <button class="${this.currentTab.value === 'console' ? 'active' : ''}" @click="${() => this.currentTab.value = 'console'}">Console</button>
        <button class="${this.currentTab.value === 'example' ? 'active' : ''}" @click="${() => this.currentTab.value = 'example'}">Example</button>
        <button class="${this.currentTab.value === 'doc' ? 'active' : ''} doc-button" @click="${() => this.currentTab.value = 'doc'}">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 2H14L19 7V20C19 21.1046 18.1046 22 17 22H6C4.89543 22 4 21.1046 4 20V4C4 2.89543 4.89543 2 6 2Z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
            <path
              d="M14 2V7H19"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
          </svg> <span>Create Doc</span>
        </button>
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
    if (config.type === Array || config.type === Object) {
      return html`<textarea class="json-input" rows="4" .value="${JSON.stringify(currentValue, null, 2)}" @change="${(e) => {
        try { this._updatePropValue(name, JSON.parse(e.target.value)); }
        catch { e.target.classList.add('json-error'); }
      }}" @input="${(e) => e.target.classList.remove('json-error')}"></textarea>`;
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
      ${this.currentTab.value === 'console' ? this._getDetailConsole : ''}
      ${this.currentTab.value === 'example' ? this._getDetailExample : ''}
      ${this.currentTab.value === 'doc' ? this._getDetailReadme : ''}
    `;
  }

  _generateReadme() {
    const comp = this.currentComponent.value;
    if (!comp) return '';

    const tag = comp.tag;
    const name = comp.name;
    const description = comp.description || '';
    const registryUrl = 'github.com/your-org/your-catalog';

    let md = `# ${name}\n\n`;
    md += `${description}\n\n`;

    // Install section
    md += `## Installation\n\n`;
    md += `\`\`\`bash\n`;
    md += `okalit add ${tag} --registry ${registryUrl}\n`;
    md += `\`\`\`\n\n`;
    md += `Or manually copy to your project:\n\n`;
    md += `\`\`\`bash\n`;
    md += `# The component will be installed in src/catalogs/${tag}/\n`;
    md += `\`\`\`\n\n`;

    // Usage section
    md += `## Usage\n\n`;
    md += `\`\`\`js\n`;
    md += `import '@catalogs/${tag}/${tag}.js';\n`;
    md += `\`\`\`\n\n`;

    // Example
    const attrs = comp.props.map(prop => {
      const [propName, config] = Object.entries(prop)[0];
      return `  ${propName}="${config.value}"`;
    });
    const events = (comp.events || []).map(ev => `  @${ev}="\${handler}"`);
    const lines = [...attrs, ...events];
    const slotContent = (comp.slots || []).map(slot => {
      if (slot.name === 'default') return `  ${slot.content}`;
      return `  <span slot="${slot.name}">${slot.content}</span>`;
    }).join('\n');

    md += `\`\`\`html\n`;
    md += `<${tag}`;
    if (lines.length) md += `\n${lines.join('\n')}\n`;
    md += `>`;
    if (slotContent) md += `\n${slotContent}\n`;
    md += `</${tag}>\n`;
    md += `\`\`\`\n\n`;

    // Props table
    if (comp.props.length) {
      md += `## Props\n\n`;
      md += `| Name | Type | Default |\n`;
      md += `|------|------|---------|\n`;
      for (const prop of comp.props) {
        const [propName, config] = Object.entries(prop)[0];
        md += `| \`${propName}\` | \`${config.type.name}\` | \`${JSON.stringify(config.value)}\` |\n`;
      }
      md += `\n`;
    }

    // Slots
    const slots = comp.slots || [];
    if (slots.length) {
      md += `## Slots\n\n`;
      md += `| Name | Description |\n`;
      md += `|------|-------------|\n`;
      for (const slot of slots) {
        md += `| \`${slot.name}\` | ${slot.description || '-'} |\n`;
      }
      md += `\n`;
    }

    // Events
    if (comp.events?.length) {
      md += `## Events\n\n`;
      md += `| Name |\n`;
      md += `|------|\n`;
      for (const ev of comp.events) {
        md += `| \`${ev}\` |\n`;
      }
      md += `\n`;
    }

    // Channels
    if (comp.channels?.length) {
      md += `## Channels\n\n`;
      md += `This component subscribes to the following channels:\n\n`;
      for (const ch of comp.channels) {
        md += `- \`${ch}\`\n`;
      }
      md += `\n`;
      md += `> Make sure these channels are defined in your application.\n\n`;
    }

    // License
    md += `## License\n\nMIT\n`;

    return md;
  }

  _downloadReadme() {
    const content = this._generateReadme();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  get _getDetailReadme() {
    const readme = this._generateReadme();
    return html`
      <div class="doc-section">
        <div class="doc-actions">
          <button class="doc-btn" @click="${() => this._downloadReadme()}">⬇ Download README.md</button>
          <button class="doc-btn" @click="${() => this._copyReadme()}">📋 Copy</button>
        </div>
        <pre class="code-example doc-preview"><code>${readme}</code></pre>
      </div>
    `;
  }

  _copyReadme() {
    const content = this._generateReadme();
    navigator.clipboard.writeText(content);
    this._logToConsole('info', 'README.md copied!');
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
    `;
  }
}
