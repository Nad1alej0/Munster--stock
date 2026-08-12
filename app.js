
const PRODUCTS = [["Aguas", "Agua sin gas"], ["Aguas", "Agua con gas"], ["Aguas saborizadas", "Agua saborizada pomelo"], ["Aguas saborizadas", "Agua saborizada pera"], ["Aguas saborizadas", "Agua saborizada manzana"], ["Aguas saborizadas", "Agua saborizada naranja"], ["Aguas saborizadas", "Agua saborizada limonada"], ["Gaseosas", "Coca-Cola"], ["Gaseosas", "Coca-Cola Zero"], ["Gaseosas", "Pepsi"], ["Gaseosas", "Pepsi Black"], ["Gaseosas", "Fanta"], ["Gaseosas", "Mirinda"], ["Gaseosas", "Sprite"], ["Gaseosas", "7 Up"], ["Tónicas y pomelos", "Schweppes Tónica"], ["Tónicas y pomelos", "Schweppes Pomelo"], ["Tónicas y pomelos", "Paso de los Toros Tónica"], ["Tónicas y pomelos", "Paso de los Toros Pomelo"]];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const dateInput = $('#date');
const shiftInput = $('#shift');
const responsibleInput = $('#resp');
const productsContainer = $('#products');
const voiceStatus = $('#voiceStatus');
const productSearch = $('#productSearch');
const clearSearch = $('#clearSearch');
const searchCount = $('#searchCount');
const noResults = $('#noResults');
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

function filterProducts() {
  const query = normalize(productSearch.value.trim());
  let visibleCount = 0;

  $$('.category').forEach(section => {
    let categoryCount = 0;

    section.querySelectorAll('.card').forEach(card => {
      const searchableText = normalize(card.dataset.name);
      const matches = !query || searchableText.includes(query);

      card.hidden = !matches;
      if (matches) {
        categoryCount++;
        visibleCount++;
      }
    });

    section.hidden = categoryCount === 0;
  });

  clearSearch.hidden = !query;
  noResults.hidden = visibleCount !== 0;
  searchCount.textContent = `${visibleCount} ${visibleCount === 1 ? 'bebida' : 'bebidas'}`;
}

productSearch.addEventListener('input', () => {
  stopActiveVoice();
  filterProducts();
});

clearSearch.addEventListener('click', () => {
  productSearch.value = '';
  filterProducts();
  productSearch.focus();
});

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
  productSearch.value = '';
  filterProducts();
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
    const missingItems = differences.filter(item => item.difference < 0);
    const extraItems = differences.filter(item => item.difference > 0);

    if (missingItems.length) {
      text += '\n🔴 *ME FALTAN*\n';
      missingItems.forEach(item => {
        text += `• ${item.name}: ${Math.abs(item.difference)}\n`;
      });
    }

    if (extraItems.length) {
      text += '\n🟡 *ME SOBRAN*\n';
      extraItems.forEach(item => {
        text += `• ${item.name}: ${item.difference}\n`;
      });
    }
  } else if (loaded.length) {
    text += '\n✅ Todo el stock físico coincide con el sistema.';
  } else {
    text += '\n⚠️ No se cargaron productos.';
  }

  return text;
}

function loadedItems(data) {
  return data.items.filter(item => {
    const productInputs = $$(`input[data-p="${item.name}"]`);
    return productInputs.some(input => input.value !== '');
  });
}

function safeFilenamePart(value) {
  return (value || 'Sin-responsable')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function downloadPdf(data) {
  if (!window.jspdf?.jsPDF) {
    alert('No pude preparar el PDF. Actualizá la aplicación y volvé a intentar.');
    return;
  }

  const items = loadedItems(data);
  if (!items.length) {
    alert('Primero cargá al menos una bebida para generar el PDF.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;
  const formattedDate = data.date
    ? data.date.split('-').reverse().join('/')
    : 'Sin indicar';
  const missingItems = items.filter(item => item.difference < 0);
  const extraItems = items.filter(item => item.difference > 0);
  const correct = items.filter(item => item.difference === 0).length;
  let y = 0;

  function header() {
    doc.setFillColor(18, 60, 46);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.text('MUNSTER STOCK', margin, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Informe de control de bebidas', margin, 21);
    doc.setTextColor(24, 33, 29);
    y = 40;
  }

  function newPageIfNeeded(requiredHeight) {
    if (y + requiredHeight <= pageHeight - 15) return;
    doc.addPage();
    header();
  }

  function sectionTitle(title, color) {
    newPageIfNeeded(13);
    doc.setFillColor(...color);
    doc.roundedRect(margin, y, usableWidth, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, margin + 4, y + 6);
    doc.setTextColor(24, 33, 29);
    y += 13;
  }

  function differenceList(title, list, color) {
    if (!list.length) return;
    sectionTitle(title, color);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    list.forEach(item => {
      newPageIfNeeded(7);
      const amount = Math.abs(item.difference);
      doc.text(`• ${item.name}: ${amount}`, margin + 3, y + 4);
      y += 7;
    });
    y += 3;
  }

  header();

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', margin, y);
  doc.text('Turno:', margin + 62, y);
  doc.text('Responsable:', margin + 112, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formattedDate, margin + 15, y);
  doc.text(data.shift || 'Sin indicar', margin + 76, y);
  doc.text(data.responsible || 'Sin indicar', margin + 137, y);
  y += 10;

  const boxWidth = (usableWidth - 9) / 4;
  const totals = [
    ['Controlados', items.length],
    ['Correctos', correct],
    ['Faltantes', missingItems.length],
    ['Sobrantes', extraItems.length]
  ];
  totals.forEach(([label, number], index) => {
    const x = margin + index * (boxWidth + 3);
    doc.setFillColor(244, 247, 245);
    doc.roundedRect(x, y, boxWidth, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(String(number), x + boxWidth / 2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(label, x + boxWidth / 2, y + 14, { align: 'center' });
  });
  y += 25;

  differenceList('ME FALTAN', missingItems, [179, 38, 30]);
  differenceList('ME SOBRAN', extraItems, [184, 125, 16]);

  sectionTitle('DETALLE DEL CONTEO', [18, 60, 46]);
  const columns = [margin, margin + 83, margin + 112, margin + 148, pageWidth - margin];

  function tableHeader() {
    doc.setFillColor(234, 244, 239);
    doc.rect(margin, y, usableWidth, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Bebida', columns[0] + 2, y + 6);
    doc.text('Sistema', columns[2] - 2, y + 6, { align: 'right' });
    doc.text('Físico', columns[3] - 2, y + 6, { align: 'right' });
    doc.text('Diferencia', columns[4] - 2, y + 6, { align: 'right' });
    y += 9;
  }

  tableHeader();
  items.forEach((item, index) => {
    if (y + 8 > pageHeight - 15) {
      doc.addPage();
      header();
      tableHeader();
    }
    if (index % 2 === 1) {
      doc.setFillColor(248, 249, 248);
      doc.rect(margin, y, usableWidth, 8, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const name = doc.splitTextToSize(item.name, 78)[0];
    doc.text(name, columns[0] + 2, y + 5.5);
    doc.text(String(item.system), columns[2] - 2, y + 5.5, { align: 'right' });
    doc.text(String(item.physical), columns[3] - 2, y + 5.5, { align: 'right' });
    const difference = item.difference > 0 ? `+${item.difference}` : String(item.difference);
    if (item.difference < 0) doc.setTextColor(179, 38, 30);
    else if (item.difference > 0) doc.setTextColor(169, 96, 0);
    else doc.setTextColor(46, 125, 50);
    doc.setFont('helvetica', 'bold');
    doc.text(difference, columns[4] - 2, y + 5.5, { align: 'right' });
    doc.setTextColor(24, 33, 29);
    doc.setDrawColor(223, 230, 226);
    doc.line(margin, y + 8, pageWidth - margin, y + 8);
    y += 8;
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(104, 117, 111);
    doc.text(`Munster Stock • Página ${page} de ${pageCount}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
  }

  const dateForFile = data.date || new Date().toISOString().slice(0, 10);
  const filename = `Munster-Stock_${dateForFile}_${safeFilenamePart(data.shift)}_${safeFilenamePart(data.responsible)}.pdf`;
  doc.save(filename);
}

$('#downloadPdf').addEventListener('click', () => downloadPdf(collectData()));

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
filterProducts();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js'));
}
