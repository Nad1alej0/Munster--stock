
const PRODUCTS = [["Aguas", "Agua sin gas"], ["Aguas", "Agua con gas"], ["Aguas saborizadas", "Agua saborizada pomelo"], ["Aguas saborizadas", "Agua saborizada pera"], ["Aguas saborizadas", "Agua saborizada manzana"], ["Aguas saborizadas", "Agua saborizada naranja"], ["Aguas saborizadas", "Agua saborizada limonada"], ["Gaseosas", "Coca-Cola"], ["Gaseosas", "Coca-Cola Zero"], ["Gaseosas", "Pepsi"], ["Gaseosas", "Pepsi Black"], ["Gaseosas", "Fanta"], ["Gaseosas", "Mirinda"], ["Gaseosas", "Sprite"], ["Gaseosas", "7 Up"], ["Tónicas y pomelos", "Schweppes Tónica"], ["Tónicas y pomelos", "Schweppes Pomelo"], ["Tónicas y pomelos", "Paso de los Toros Tónica"], ["Tónicas y pomelos", "Paso de los Toros Pomelo"]];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const dateInput = $('#date');
const shiftInput = $('#shift');
const responsibleInput = $('#resp');
const productsContainer = $('#products');
const voiceStatus = $('#voiceStatus');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let activeVoice = null;

dateInput.value = new Date().toISOString().slice(0, 10);
$('#totalProducts').textContent = PRODUCTS.length;

const key = s => s
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .toLowerCase();

function render() {
  const groups = [...new Set(PRODUCTS.map(x => x[0]))];
  productsContainer.innerHTML = groups.map(group => `
    <section class="category">
      <h2>${group}</h2>
      ${PRODUCTS.filter(x => x[0] === group).map(([category, name]) => {
        const k = key(name);
        return `
          <article class="card" data-name="${name}">
            <div class="title">
              <span class="product-name">${name}</span>
              <div class="voice-controls">
                <button
                  type="button"
                  class="voice-toggle"
                  data-voice-product="${name}"
                  aria-label="Grabar conteo de ${name}">
                  <span aria-hidden="true">🎤</span>
                  <span class="voice-label">Grabar</span>
                </button>
                <button
                  type="button"
                  class="voice-ok"
                  data-voice-ok="${name}"
                  aria-label="Finalizar dictado de ${name}">
                  ✓ OK
                </button>
              </div>
              <span class="status" id="st-${k}">Sin cargar</span>
            </div>
            <div class="grid">
              ${['Sistema', 'Salón', 'Depósito', 'Pasillo'].map(field => `
                <div>
                  <label>${field}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                    data-p="${name}"
                    data-f="${field}"
                    placeholder="0">
                </div>
              `).join('')}
              <div>
                <label>Total físico</label>
                <div class="calc" id="tot-${k}">0</div>
              </div>
              <div>
                <label>Diferencia</label>
                <div class="calc" id="dif-${k}">0</div>
              </div>
            </div>
          </article>
        `;
      }).join('')}
    </section>
  `).join('');

  $$('input[data-p]').forEach(input => input.addEventListener('input', calculate));
  $$('[data-voice-product]').forEach(button =>
    button.addEventListener('click', () => toggleVoice(button.dataset.voiceProduct))
  );
  $$('[data-voice-ok]').forEach(button =>
    button.addEventListener('click', () => finishVoice(button.dataset.voiceOk))
  );
}

function value(product, field) {
  return Number(document.querySelector(
    `input[data-p="${product}"][data-f="${field}"]`
  )?.value || 0);
}

function calculate() {
  let ok = 0;
  let missing = 0;
  let extra = 0;

  PRODUCTS.forEach(([category, name]) => {
    const physical = value(name, 'Salón') + value(name, 'Depósito') + value(name, 'Pasillo');
    const system = value(name, 'Sistema');
    const difference = physical - system;
    const k = key(name);
    const card = document.querySelector(`[data-name="${name}"]`);
    const status = $(`#st-${k}`);

    $(`#tot-${k}`).textContent = physical;
    $(`#dif-${k}`).textContent = difference > 0 ? `+${difference}` : difference;

    const hasAnyValue = ['Sistema', 'Salón', 'Depósito', 'Pasillo'].some(field =>
      document.querySelector(`input[data-p="${name}"][data-f="${field}"]`).value !== ''
    );

    status.className = 'status';
    card.className = 'card';

    if (!hasAnyValue) {
      status.textContent = 'Sin cargar';
    } else if (difference === 0) {
      status.textContent = 'Correcto';
      status.classList.add('ok');
      card.classList.add('state-ok');
      ok++;
    } else if (difference < 0) {
      status.textContent = `Faltan ${Math.abs(difference)}`;
      status.classList.add('bad');
      card.classList.add('state-bad');
      missing++;
    } else {
      status.textContent = `Sobran ${difference}`;
      status.classList.add('warn');
      card.classList.add('state-warn');
      extra++;
    }
  });

  $('#okc').textContent = ok;
  $('#missc').textContent = missing;
  $('#extrac').textContent = extra;
}

function collectData() {
  return {
    date: dateInput.value,
    shift: shiftInput.value,
    responsible: responsibleInput.value.trim(),
    items: PRODUCTS.map(([category, name]) => {
      const physical = value(name, 'Salón') + value(name, 'Depósito') + value(name, 'Pasillo');
      const system = value(name, 'Sistema');
      return {
        category,
        name,
        system,
        physical,
        difference: physical - system
      };
    })
  };
}

$('#reset').addEventListener('click', () => {
  const accepted = confirm(
    '¿Querés comenzar un nuevo conteo? Esto limpiará todos los campos actuales.'
  );
  if (!accepted) return;

  $$('input[data-p]').forEach(input => input.value = '');
  responsibleInput.value = '';
  dateInput.value = new Date().toISOString().slice(0, 10);
  stopActiveVoice();
  $$('[data-voice-ok]').forEach(button => {
    button.classList.remove('done');
    button.textContent = '✓ OK';
  });
  $$('.card').forEach(card => card.classList.remove('voice-complete'));
  voiceStatus.style.display = 'none';
  calculate();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function shareText(data) {
  const loaded = data.items.filter(item => {
    const productInputs = $$(`input[data-p="${item.name}"]`);
    return productInputs.some(input => input.value !== '');
  });

  const differences = loaded.filter(item => item.difference !== 0);
  const correct = loaded.filter(item => item.difference === 0).length;

  const formattedDate = data.date
    ? data.date.split('-').reverse().join('/')
    : 'Sin indicar';
  const missing = differences.filter(item => item.difference < 0).length;
  const extra = differences.filter(item => item.difference > 0).length;

  let text = '☘️ *MUNSTER STOCK*\n\n';
  text += `📅 Fecha: ${formattedDate}\n`;
  text += `🕐 Turno: ${data.shift}\n`;
  text += `👤 Responsable: ${data.responsible || 'Sin indicar'}\n\n`;
  text += `📦 Productos controlados: ${loaded.length}\n`;
  text += `✅ Correctos: ${correct}\n`;
  text += `🔴 Con faltantes: ${missing}\n`;
  text += `🟡 Con sobrantes: ${extra}\n`;

  if (differences.length) {
    text += '\n*DIFERENCIAS*\n\n';
    differences.forEach(item => {
      text += `${item.difference < 0 ? '🔴' : '🟡'} ${item.name}: ${
        item.difference < 0
          ? 'faltan ' + Math.abs(item.difference)
          : 'sobran ' + item.difference
      }\n`;
    });
  } else if (loaded.length) {
    text += '\n✅ Todo el stock físico coincide con el sistema.';
  } else {
    text += '\n⚠️ No se cargaron productos.';
  }

  return text;
}

$('#share').addEventListener('click', async () => {
  const text = shareText(collectData());

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Munster Stock', text });
      return;
    } catch (error) {
      // El usuario puede cancelar el selector de compartir.
    }
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
});

const qrModal = $('#qrModal');
const qrCode = $('#qrCode');
const qrPreview = $('#qrPreview');

function closeQrModal() {
  qrModal.hidden = true;
  document.body.classList.remove('modal-open');
}

$('#showQr').addEventListener('click', () => {
  const text = shareText(collectData());

  if (!window.qrcode) {
    alert('No pude generar el QR. Actualizá la aplicación y volvé a intentar.');
    return;
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  try {
    const qr = qrcode(0, 'M');
    qr.addData(whatsappUrl);
    qr.make();
    qrCode.innerHTML = qr.createSvgTag({
      cellSize: 5,
      margin: 4,
      scalable: true
    });
    qrPreview.textContent = text;
    qrModal.hidden = false;
    document.body.classList.add('modal-open');
    $('#closeQr').focus();
  } catch (error) {
    alert('El resumen es demasiado largo para generar el QR. Compartilo directamente por WhatsApp.');
  }
});

$('#closeQr').addEventListener('click', closeQrModal);
$('#closeQrBottom').addEventListener('click', closeQrModal);
qrModal.addEventListener('click', event => {
  if (event.target === qrModal) closeQrModal();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !qrModal.hidden) closeQrModal();
});

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const SMALL_NUMBERS = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4,
  cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26,
  veintisiete: 27, veintiocho: 28, veintinueve: 29
};

const TENS = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60,
  setenta: 70, ochenta: 80, noventa: 90
};

function parseSpokenNumber(text) {
  const digit = text.match(/\d+/);
  if (digit) return Number(digit[0]);

  const words = normalize(text)
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let total = 0;
  let found = false;

  for (const word of words) {
    if (word in SMALL_NUMBERS) {
      total += SMALL_NUMBERS[word];
      found = true;
    } else if (word in TENS) {
      total += TENS[word];
      found = true;
    } else if (word === 'cien') {
      total += 100;
      found = true;
    } else if (word === 'ciento') {
      total += 100;
      found = true;
    } else if (word === 'doscientos') {
      total += 200;
      found = true;
    } else if (word === 'trescientos') {
      total += 300;
      found = true;
    }
  }

  return found ? total : null;
}

const FIELD_ALIASES = {
  'Sistema': ['sistema'],
  'Salón': ['salon'],
  'Depósito': ['deposito', 'depo'],
  'Pasillo': ['pasillo', 'heladera pasillo', 'heladeras pasillo']
};

function setVoiceStatus(message, mode = '') {
  voiceStatus.style.display = 'block';
  voiceStatus.className = mode;
  voiceStatus.textContent = message;
}

function resetVoiceButtons(exceptProduct = '') {
  $$('[data-voice-product]').forEach(button => {
    if (button.dataset.voiceProduct === exceptProduct) return;
    button.classList.remove('listening');
    button.querySelector('.voice-label').textContent = 'Grabar';
    button.querySelector('[aria-hidden]').textContent = '🎤';
  });
}

function stopActiveVoice() {
  if (!activeVoice) return;
  activeVoice.manuallyStopped = true;
  try {
    activeVoice.recognition.stop();
  } catch (error) {
    // El reconocimiento puede haberse detenido solo por silencio.
  }
  activeVoice = null;
  resetVoiceButtons();
}

function loadVoicePhrase(product, transcript) {
  const normalized = normalize(transcript);
  const aliases = Object.values(FIELD_ALIASES).flat()
    .sort((a, b) => b.length - a.length)
    .map(alias => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const boundary = `(?=${aliases.join('|')}|$)`;
  let loaded = 0;

  Object.entries(FIELD_ALIASES).forEach(([field, fieldAliases]) => {
    for (const alias of fieldAliases.sort((a, b) => b.length - a.length)) {
      const match = normalized.match(new RegExp(`${alias}\\s+(.+?)${boundary}`));
      if (!match) continue;

      const number = parseSpokenNumber(match[1]);
      if (number !== null) {
        document.querySelector(
          `input[data-p="${product}"][data-f="${field}"]`
        ).value = number;
        loaded++;
      }
      break;
    }
  });

  calculate();
  return loaded;
}

function toggleVoice(product) {
  if (!SpeechRecognition) {
    alert('El dictado no está disponible aquí. En Android suele funcionar mejor desde Google Chrome.');
    return;
  }

  if (activeVoice?.product === product) {
    activeVoice.manuallyStopped = true;
    activeVoice.recognition.stop();
    const button = document.querySelector(`[data-voice-product="${product}"]`);
    button.classList.remove('listening');
    button.querySelector('.voice-label').textContent = 'Continuar';
    button.querySelector('[aria-hidden]').textContent = '▶';
    setVoiceStatus(`${product}: dictado pausado. Podés revisar los números y continuar.`, 'paused');
    activeVoice = null;
    return;
  }

  stopActiveVoice();
  resetVoiceButtons(product);

  const card = document.querySelector(`[data-name="${product}"]`);
  const okButton = document.querySelector(`[data-voice-ok="${product}"]`);
  card.classList.remove('voice-complete');
  okButton.classList.remove('done');
  okButton.textContent = '✓ OK';

  const recognition = new SpeechRecognition();
  recognition.lang = 'es-AR';
  recognition.interimResults = false;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;

  const button = document.querySelector(`[data-voice-product="${product}"]`);
  button.classList.add('listening');
  button.querySelector('.voice-label').textContent = 'Pausar';
  button.querySelector('[aria-hidden]').textContent = '⏸';

  activeVoice = { product, recognition, manuallyStopped: false };
  setVoiceStatus(`${product}: escuchando… Decí, por ejemplo, “Sistema veinte”.`, 'listening');

  recognition.onresult = event => {
    const transcripts = [];
    let loaded = 0;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (!event.results[i].isFinal) continue;
      const transcript = event.results[i][0].transcript;
      transcripts.push(transcript);
      loaded += loadVoicePhrase(product, transcript);
    }

    if (!transcripts.length) return;
    setVoiceStatus(
      loaded
        ? `${product}: cargado “${transcripts.join(' ')}”.`
        : `${product}: escuché “${transcripts.join(' ')}”, pero no reconocí ubicación y número.`,
      loaded ? 'success' : 'error'
    );
  };

  recognition.onerror = event => {
    if (event.error === 'aborted') return;
    setVoiceStatus(
      event.error === 'not-allowed'
        ? 'Necesito permiso para usar el micrófono. Permitilo en Chrome y volvé a intentar.'
        : `${product}: no pude entender. Pausá y probá de nuevo.`,
      'error'
    );
  };

  recognition.onend = () => {
    if (activeVoice?.recognition !== recognition) return;
    activeVoice = null;
    button.classList.remove('listening');
    button.querySelector('.voice-label').textContent = 'Continuar';
    button.querySelector('[aria-hidden]').textContent = '▶';
    if (!button.closest('.card').classList.contains('voice-complete')) {
      setVoiceStatus(`${product}: dictado pausado. Tocá Continuar o ✓ OK.`, 'paused');
    }
  };

  try {
    recognition.start();
  } catch (error) {
    activeVoice = null;
    button.classList.remove('listening');
    button.querySelector('.voice-label').textContent = 'Continuar';
    button.querySelector('[aria-hidden]').textContent = '▶';
    setVoiceStatus('No pude iniciar el micrófono. Esperá un segundo y volvé a tocar Continuar.', 'error');
  }
}

function finishVoice(product) {
  if (activeVoice?.product === product) stopActiveVoice();

  const card = document.querySelector(`[data-name="${product}"]`);
  const okButton = document.querySelector(`[data-voice-ok="${product}"]`);
  const voiceButton = document.querySelector(`[data-voice-product="${product}"]`);

  card.classList.add('voice-complete');
  okButton.classList.add('done');
  okButton.textContent = '✓ Listo';
  voiceButton.classList.remove('listening');
  voiceButton.querySelector('.voice-label').textContent = 'Grabar';
  voiceButton.querySelector('[aria-hidden]').textContent = '🎤';
  setVoiceStatus(`${product}: dictado finalizado.`, 'success');
}

render();
calculate();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js'));
}
