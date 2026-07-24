
const PRODUCTS = [["Aguas", "Agua sin gas"], ["Aguas", "Agua con gas"], ["Aguas saborizadas", "Agua saborizada pomelo"], ["Aguas saborizadas", "Agua saborizada pera"], ["Aguas saborizadas", "Agua saborizada manzana"], ["Aguas saborizadas", "Agua saborizada naranja"], ["Aguas saborizadas", "Agua saborizada limonada"], ["Gaseosas", "Coca-Cola"], ["Gaseosas", "Coca-Cola Zero"], ["Gaseosas", "Pepsi"], ["Gaseosas", "Pepsi Black"], ["Gaseosas", "Fanta"], ["Gaseosas", "Mirinda"], ["Gaseosas", "Sprite"], ["Gaseosas", "7 Up"], ["Tónicas y pomelos", "Schweppes Tónica"], ["Tónicas y pomelos", "Schweppes Pomelo"], ["Tónicas y pomelos", "Paso de los Toros Tónica"], ["Tónicas y pomelos", "Paso de los Toros Pomelo"]];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const dateInput = $('#date');
const shiftInput = $('#shift');
const responsibleInput = $('#resp');
const productsContainer = $('#products');
const voiceStatus = $('#voiceStatus');

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
              <span>${name}</span>
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

  let text = `*CONTROL DE STOCK – TURNO ${data.shift.toUpperCase()}*\n`;
  text += `Fecha: ${data.date}\n`;
  text += `Responsable: ${data.responsible || 'Sin indicar'}\n\n`;
  text += `Productos controlados: ${loaded.length} | Correctos: ${correct} | Con diferencia: ${differences.length}\n`;

  if (differences.length) {
    text += '\n*Diferencias:*\n';
    differences.forEach(item => {
      text += `• ${item.name}: ${item.difference < 0
        ? 'faltan ' + Math.abs(item.difference)
        : 'sobran ' + item.difference}\n`;
    });
  } else if (loaded.length) {
    text += '\n✅ Todo coincide con el sistema.';
  } else {
    text += '\nNo se cargaron productos.';
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

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

$('#voice').addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert('El dictado no está disponible aquí. En Android suele funcionar mejor desde Google Chrome.');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'es-AR';
  recognition.interimResults = false;

  voiceStatus.style.display = 'block';
  voiceStatus.textContent = 'Escuchando… Ejemplo: “Coca-Cola, sistema 20, salón 5, depósito 10, pasillo 4”.';
  recognition.start();

  recognition.onresult = event => {
    const transcript = event.results[0][0].transcript;
    const normalized = normalize(transcript);

    voiceStatus.textContent = `Escuché: ${transcript}`;

    const product = PRODUCTS
      .map(x => x[1])
      .sort((a, b) => b.length - a.length)
      .find(name => normalized.includes(normalize(name)));

    if (!product) {
      voiceStatus.textContent += ' — No reconocí la bebida.';
      return;
    }

    let loaded = 0;
    const fieldAliases = {
      'Sistema': ['sistema'],
      'Salón': ['salon'],
      'Depósito': ['deposito', 'depo'],
      'Pasillo': ['pasillo']
    };

    Object.entries(fieldAliases).forEach(([field, aliases]) => {
      for (const alias of aliases) {
        const match = normalized.match(new RegExp(alias + '\\s+(\\d+)'));
        if (match) {
          document.querySelector(
            `input[data-p="${product}"][data-f="${field}"]`
          ).value = match[1];
          loaded++;
          break;
        }
      }
    });

    calculate();
    document.querySelector(`[data-name="${product}"]`)
      .scrollIntoView({ behavior: 'smooth', block: 'center' });

    voiceStatus.textContent += loaded
      ? ` — Cargado en ${product}.`
      : ' — Reconocí la bebida, pero no los números.';
  };

  recognition.onerror = () => {
    voiceStatus.textContent = 'No pude entender. Probá de nuevo o escribí los números.';
  };
});

render();
calculate();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js'));
}
