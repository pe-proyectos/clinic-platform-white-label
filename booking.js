// ==========================================
// BOOKING MODAL - Sin Mercado Pago
// Métodos de pago: Yape QR | Presencial
// ==========================================

var bookingState = {
    step: 1,
    selectedDate: null,
    selectedTime: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    doctorId: null,
    doctorName: '',
    appointmentId: null,
    isTransitioning: false,
    availableDates: {},
    paymentMethod: null // 'yape' | 'presencial'
};

var MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// ==========================================
// MODAL OPEN / CLOSE
// ==========================================

async function openBookingModal() {
    var modal = document.getElementById("booking-modal");
    var backdrop = document.getElementById("booking-backdrop");
    var container = document.getElementById("booking-container");

    // Reset state
    bookingState.step = 1;
    bookingState.selectedDate = new Date();
    bookingState.selectedTime = null;
    bookingState.currentMonth = new Date().getMonth();
    bookingState.currentYear = new Date().getFullYear();
    bookingState.appointmentId = null;
    bookingState.paymentMethod = null;

    // Load doctor info
    try {
        const response = await fetch(`${CONFIG.apiUrl}/book/${CONFIG.doctorSlug}`);
        const result = await response.json();
        if (result.success) {
            bookingState.doctorId = result.data.id;
            bookingState.doctorName = result.data.name;
        } else {
            console.error('Error loading doctor:', result.error);
            alert('Error al cargar información del doctor');
            return;
        }
    } catch (error) {
        console.error('Error fetching doctor:', error);
        alert('Error de conexión. Por favor verifica que el backend esté corriendo.');
        return;
    }

    // Reset form
    document.getElementById("booking-name").value = "";
    document.getElementById("booking-dni").value = "";
    document.getElementById("booking-phone").value = "";
    document.getElementById("booking-procedure").selectedIndex = 0;
    document.getElementById("booking-message").value = "";

    // Show modal
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    showStep(1);

    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            backdrop.classList.remove("opacity-0");
            backdrop.classList.add("opacity-100");
            container.classList.remove("scale-95", "opacity-0");
            container.classList.add("scale-100", "opacity-100");
        });
    });

    setTimeout(function () { renderCalendar(); }, 50);
}

function closeBookingModal() {
    var modal = document.getElementById("booking-modal");
    var backdrop = document.getElementById("booking-backdrop");
    var container = document.getElementById("booking-container");

    // Si cierra en paso 3 sin haber confirmado, cancela la cita en el backend
    if (bookingState.step === 3 && bookingState.appointmentId && bookingState.doctorId) {
        fetch(
            CONFIG.apiUrl + '/clients/' + bookingState.doctorId + '/bookings/' + bookingState.appointmentId + '/cancel',
            { method: 'PATCH', headers: { 'Content-Type': 'application/json' } }
        ).catch(function (err) {
            console.error('Error cancelando cita:', err);
        });
    }

    backdrop.classList.remove("opacity-100");
    backdrop.classList.add("opacity-0");
    container.classList.remove("scale-100", "opacity-100");
    container.classList.add("scale-95", "opacity-0");

    setTimeout(function () {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
        bookingState.appointmentId = null;
        bookingState.paymentMethod = null;
    }, 300);
}

document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "booking-backdrop") {
        closeBookingModal();
    }
});

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        var modal = document.getElementById("booking-modal");
        if (!modal.classList.contains("hidden")) {
            closeBookingModal();
        }
    }
});

// ==========================================
// STEP NAVIGATION
// ==========================================

function showStep(step) {
    bookingState.step = step;

    for (var i = 1; i <= 4; i++) {
        var el = document.getElementById("booking-step-" + i);
        if (i === step) {
            el.classList.remove("hidden");
        } else {
            el.classList.add("hidden");
        }
    }

    // Back button: visible en pasos 2 y 3, no en 1 ni 4
    var backBtn = document.getElementById("booking-back-btn");
    if (step > 1 && step < 4) {
        backBtn.classList.remove("hidden");
        backBtn.classList.add("flex");
    } else {
        backBtn.classList.add("hidden");
        backBtn.classList.remove("flex");
    }

    updateSidebar();

    if (step === 4) {
        populateSummary();
    }
}

function bookingNextStep() {
    if (bookingState.step < 4) {
        showStep(bookingState.step + 1);
    }
}

function bookingPrevStep() {
    if (bookingState.step > 1) {
        showStep(bookingState.step - 1);
    }
}

// ==========================================
// STEP 2 → STEP 3: Crear cita en backend
// ==========================================

async function bookingStep2Next() {
    validateStep2();
    var btn = document.getElementById("booking-step2-next");
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    btn.textContent = 'Creando cita...';

    try {
        await createAppointment();
        bookingNextStep(); // Ir al paso 3: elegir método de pago
    } catch (error) {
        console.error('Error creating appointment:', error);
        var errorMsg = 'Error al crear la cita. Por favor intenta de nuevo.';
        if (error.message.includes('Unique constraint failed')) {
            errorMsg = 'Este horario ya no está disponible. Por favor elige otro.';
            renderTimeSlots();
        } else if (error.message.includes('no está dentro de la disponibilidad')) {
            errorMsg = 'El horario seleccionado no está dentro del horario de atención.';
        } else if (error.message.includes('no está disponible')) {
            errorMsg = 'Este horario ya está ocupado. Por favor elige otro.';
        }
        alert(errorMsg);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Continuar';
    }
}

// ==========================================
// CREATE APPOINTMENT
// ==========================================

async function createAppointment() {
    var name = document.getElementById("booking-name").value.trim();
    var dni = document.getElementById("booking-dni").value.trim();
    var phone = document.getElementById("booking-phone").value.trim();
    var procedure = document.getElementById("booking-procedure").value;
    var message = document.getElementById("booking-message").value.trim();

    var year = bookingState.selectedDate.getFullYear();
    var month = bookingState.selectedDate.getMonth();
    var day = bookingState.selectedDate.getDate();
    var timeParts = bookingState.selectedTime.split(':');
    var hours = parseInt(timeParts[0]);
    var minutes = parseInt(timeParts[1]);

    var startDateTime = new Date(year, month, day, hours, minutes, 0, 0);
    var endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + CONFIG.appointmentDuration);

    const response = await fetch(`${CONFIG.apiUrl}/book/${CONFIG.doctorSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            guestName: name,
            guestEmail: dni.replace(/\D/g, '') + '@paciente.com',
            guestPhone: phone,
            notes: 'Procedimiento: ' + procedure + '\nMensaje: ' + (message || 'N/A'),
            startDatetime: startDateTime.toISOString(),
            endDatetime: endDateTime.toISOString()
        })
    });

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Error creating appointment');
    }

    bookingState.appointmentId = result.data.id;
}

// ==========================================
// PASO 3: SELECCIÓN DE MÉTODO DE PAGO
// ==========================================

function selectPaymentMethod(method) {
    bookingState.paymentMethod = method;

    // Ocultar ambas secciones primero
    document.getElementById('payment-yape-section').classList.add('hidden');
    document.getElementById('payment-presencial-section').classList.add('hidden');

    // Quitar selección activa de los dos botones
    document.getElementById('btn-yape').classList.remove('ring-2', 'ring-[#dd4d4d]', 'border-[#dd4d4d]', 'bg-rose-50');
    document.getElementById('btn-presencial').classList.remove('ring-2', 'ring-[#dd4d4d]', 'border-[#dd4d4d]', 'bg-rose-50');

    if (method === 'yape') {
        document.getElementById('btn-yape').classList.add('ring-2', 'ring-[#dd4d4d]', 'border-[#dd4d4d]', 'bg-rose-50');
        document.getElementById('payment-yape-section').classList.remove('hidden');
    } else if (method === 'presencial') {
        document.getElementById('btn-presencial').classList.add('ring-2', 'ring-[#dd4d4d]', 'border-[#dd4d4d]', 'bg-rose-50');
        document.getElementById('payment-presencial-section').classList.remove('hidden');
    }
}

// Confirmar pago presencial → WhatsApp + paso 4
async function confirmPresencial() {
    bookingState.paymentMethod = 'presencial';

    // Deshabilitar botón para evitar doble clic
    var btn = document.querySelector('button[onclick="confirmPresencial()"]');
    if (btn) btn.disabled = true;

    await confirmBookingBackend('presencial');
    sendPresencialWhatsApp();
    showStep(4);
}

// ==========================================
// WHATSAPP NOTIFICATIONS
// ==========================================

async function confirmBookingBackend(method) {
    if (!bookingState.appointmentId || !bookingState.doctorId) return;
    try {
        const response = await fetch(
            `${CONFIG.apiUrl}/book/${CONFIG.doctorSlug}/${bookingState.appointmentId}/confirm`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method })
            }
        );
        const result = await response.json();
        if (!result.success) {
            console.error('Error confirmando cita en el backend:', result.error);
        }
    } catch (err) {
        console.error('Error confirmando cita:', err);
    }
}

function buildWhatsAppMessage(method) {
    var name = document.getElementById("booking-name").value.trim();
    var dni = document.getElementById("booking-dni").value.trim();
    var phone = document.getElementById("booking-phone").value.trim();
    var procedure = document.getElementById("booking-procedure").value;

    var dateText = bookingState.selectedDate
        ? bookingState.selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })
        : "Sin fecha";
    dateText = dateText.charAt(0).toUpperCase() + dateText.slice(1);
    var timeText = bookingState.selectedTime || "Sin hora";

    var e = {
        wave: "👋",
        person: "👤",
        id: "🆔",
        phone: "📱",
        cal: "📅",
        clock: "⏰",
        doctor: "🩺",
        card: "💳",
    };

    var msg = "Buen día Doctor Cristian, acabo de reservar una cita en su plataforma web. " + e.wave + "\n\n"
        + "*Mis datos:*\n"
        + e.person + " Nombre: " + name + "\n"
        + e.id + " DNI: " + dni + "\n"
        + e.phone + " Celular: " + phone + "\n\n"
        + "*Detalles de la reserva:*\n"
        + e.cal + " Fecha: " + dateText + "\n"
        + e.clock + " Hora: " + timeText + " hrs\n"
        + e.doctor + " Procedimiento: " + procedure + "\n\n"
        + (method === 'yape'
            ? e.card + " He seleccionado pagar mediante Yape. Adjunto la captura de pantalla de mi comprobante."
            : e.card + " He seleccionado pagar de forma presencial. Realizaré el pago en el consultorio el día de mi cita.");

    return msg;
}

async function sendYapeWhatsApp() {
    var btn = document.querySelector('button[onclick="sendYapeWhatsApp()"]');
    if (btn) btn.disabled = true;

    await confirmBookingBackend('yape');

    var msg = buildWhatsAppMessage('yape');
    var url = `https://api.whatsapp.com/send?phone=${CONFIG.whatsappNumber}&text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");

    setTimeout(function () {
        showStep(4);
    }, 800);
}

function sendPresencialWhatsApp() {
    var msg = buildWhatsAppMessage('presencial');
    var url = `https://api.whatsapp.com/send?phone=${CONFIG.whatsappNumber}&text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
}

// ==========================================
// SIDEBAR UPDATE
// ==========================================

function updateSidebar() {
    var dateEl = document.getElementById("sidebar-date");
    var dateText = document.getElementById("sidebar-date-text");
    var timeEl = document.getElementById("sidebar-time");
    var timeText = document.getElementById("sidebar-time-text");

    if (bookingState.selectedDate) {
        dateEl.classList.remove("hidden");
        dateEl.classList.add("flex");
        dateText.textContent = bookingState.selectedDate.toLocaleDateString("es-ES", {
            weekday: "long", month: "long", day: "numeric"
        });
    } else {
        dateEl.classList.add("hidden");
        dateEl.classList.remove("flex");
    }

    if (bookingState.selectedTime) {
        timeEl.classList.remove("hidden");
        timeEl.classList.add("flex");
        timeText.textContent = bookingState.selectedTime + " hrs";
    } else {
        timeEl.classList.add("hidden");
        timeEl.classList.remove("flex");
    }
}

// ==========================================
// CALENDAR RENDERING
// ==========================================

async function renderCalendar() {
    bookingState.isTransitioning = true;

    var year = bookingState.currentYear;
    var month = bookingState.currentMonth;

    document.getElementById("calendar-month-title").textContent = MONTH_NAMES[month] + " " + year;

    var container = document.getElementById("calendar-days");

    var currentHeight = container.offsetHeight;
    if (currentHeight > 0) container.style.minHeight = currentHeight + 'px';

    container.style.transition = 'opacity 0.2s ease-in-out';
    container.style.opacity = '0.4';

    await new Promise(function (r) { setTimeout(r, 200); });

    container.innerHTML = '';

    var startDate = new Date(year, month, 1);
    var endDate = new Date(year, month + 1, 0);

    try {
        const response = await fetch(
            CONFIG.apiUrl + '/book/' + CONFIG.doctorSlug + '/dates?startDate=' + formatDate(startDate) + '&endDate=' + formatDate(endDate)
        );
        const result = await response.json();
        if (result.success) {
            bookingState.availableDates = {};
            result.data.forEach(function (day) {
                bookingState.availableDates[day.date] = day.hasSlots;
            });
        }
    } catch (error) {
        console.error('Error loading availability:', error);
    }

    container.innerHTML = "";

    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var firstDay = new Date(year, month, 1).getDay();
    var blanks = firstDay === 0 ? 6 : firstDay - 1;

    for (var b = 0; b < blanks; b++) {
        var blank = document.createElement("div");
        blank.className = "aspect-square";
        container.appendChild(blank);
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    for (var d = 1; d <= daysInMonth; d++) {
        var dayDate = new Date(year, month, d);
        var dateStr = formatDate(dayDate);
        var isPast = dayDate < today;
        var hasAvailability = bookingState.availableDates[dateStr] === true;
        var isSelected = bookingState.selectedDate &&
            bookingState.selectedDate.getDate() === d &&
            bookingState.selectedDate.getMonth() === month &&
            bookingState.selectedDate.getFullYear() === year;

        var wrapper = document.createElement("div");
        wrapper.className = "aspect-square flex items-center justify-center relative";

        var btn = document.createElement("button");
        btn.textContent = d;
        btn.disabled = isPast || !hasAvailability;

        if (isPast || !hasAvailability) {
            btn.className = "w-full aspect-square max-w-[36px] md:max-w-[44px] rounded-full flex items-center justify-center text-[11px] md:text-sm font-bold text-slate-300 cursor-not-allowed";
        } else if (isSelected) {
            btn.className = "w-full aspect-square max-w-[36px] md:max-w-[44px] rounded-full flex items-center justify-center text-[11px] md:text-sm font-bold bg-[#dd4d4d] text-white shadow-md shadow-red-500/30";
        } else {
            btn.className = "w-full aspect-square max-w-[36px] md:max-w-[44px] rounded-full flex items-center justify-center text-[11px] md:text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-[#dd4d4d] transition-colors";
        }

        (function (day) {
            btn.addEventListener("click", function () {
                bookingState.selectedDate = new Date(year, month, day);
                bookingState.selectedTime = null;
                updateCalendarSelection();
                renderTimeSlots();
                updateSidebar();
            });
        })(d);

        wrapper.appendChild(btn);
        container.appendChild(wrapper);
    }

    requestAnimationFrame(function () {
        container.style.opacity = '1';
        setTimeout(function () {
            container.style.minHeight = '';
            bookingState.isTransitioning = false;
        }, 200);
    });

    if (bookingState.selectedDate) {
        renderTimeSlots();
    }
}

function formatDate(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function updateCalendarSelection() {
    var container = document.getElementById("calendar-days");
    var buttons = container.querySelectorAll('button');
    buttons.forEach(function (btn) {
        if (btn.disabled) return;
        var day = parseInt(btn.textContent);
        var isSelected = bookingState.selectedDate &&
            bookingState.selectedDate.getDate() === day &&
            bookingState.selectedDate.getMonth() === bookingState.currentMonth &&
            bookingState.selectedDate.getFullYear() === bookingState.currentYear;
        if (isSelected) {
            btn.className = "w-full aspect-square max-w-[36px] md:max-w-[44px] rounded-full flex items-center justify-center text-[11px] md:text-sm font-bold bg-[#dd4d4d] text-white shadow-md shadow-red-500/30";
        } else {
            btn.className = "w-full aspect-square max-w-[36px] md:max-w-[44px] rounded-full flex items-center justify-center text-[11px] md:text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-[#dd4d4d] transition-colors";
        }
    });
}

function updateTimeSlotSelection() {
    var list = document.getElementById("time-slots-list");
    var buttons = list.querySelectorAll('button');
    buttons.forEach(function (btn) {
        var time = btn.textContent;
        var isSelected = bookingState.selectedTime === time;
        if (isSelected) {
            btn.className = "w-full py-2.5 md:py-3 rounded-lg border font-bold text-xs md:text-sm transition-all flex items-center justify-center bg-[#dd4d4d] border-[#dd4d4d] text-white";
        } else {
            btn.className = "w-full py-2.5 md:py-3 rounded-lg border font-bold text-xs md:text-sm transition-all flex items-center justify-center border-slate-200 text-[#dd4d4d] hover:border-[#dd4d4d] hover:border-2";
        }
    });
}

function calendarNextMonth() {
    if (bookingState.isTransitioning) return;
    bookingState.currentMonth++;
    if (bookingState.currentMonth > 11) {
        bookingState.currentMonth = 0;
        bookingState.currentYear++;
    }
    renderCalendar();
}

function calendarPrevMonth() {
    if (bookingState.isTransitioning) return;
    bookingState.currentMonth--;
    if (bookingState.currentMonth < 0) {
        bookingState.currentMonth = 11;
        bookingState.currentYear--;
    }
    renderCalendar();
}

// ==========================================
// TIME SLOTS
// ==========================================

async function renderTimeSlots() {
    var container = document.getElementById("time-slots-container");
    var dateLabel = document.getElementById("time-slots-date");
    var list = document.getElementById("time-slots-list");

    var wasHidden = container.classList.contains("hidden");
    container.classList.remove("hidden");

    if (wasHidden) {
        container.style.opacity = '0';
        requestAnimationFrame(function () {
            container.style.transition = 'opacity 0.3s ease-out';
            container.style.opacity = '1';
        });
    }

    var sidebarTitle = document.querySelector("#booking-container h2");
    if (sidebarTitle) {
        sidebarTitle.textContent = bookingState.step === 4 ? "Cita Confirmada" : "Agendar Cita";
    }

    if (!bookingState.selectedDate) {
        dateLabel.textContent = "Selecciona una fecha";
        list.innerHTML = '<p class="text-slate-400 text-sm text-center py-8">Elige un día en el calendario</p>';
        updateStep1Button();
        return;
    }

    dateLabel.textContent = bookingState.selectedDate.toLocaleDateString("es-ES", {
        weekday: "long", month: "long", day: "numeric"
    });

    list.innerHTML = '<div class="text-center py-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#dd4d4d] mx-auto"></div></div>';

    try {
        var dateStr = formatDate(bookingState.selectedDate);
        const response = await fetch(
            CONFIG.apiUrl + '/book/' + CONFIG.doctorSlug + '/slots?date=' + dateStr
        );
        const result = await response.json();

        list.style.opacity = '0';

        setTimeout(function () {
            list.innerHTML = "";

            if (!result.success || !result.data.slots || result.data.slots.length === 0) {
                list.innerHTML = '<p class="text-slate-400 text-sm text-center py-8">No hay horarios disponibles</p>';
                list.style.opacity = '1';
                updateStep1Button();
                return;
            }

            result.data.slots.forEach(function (slot, index) {
                var isSelected = bookingState.selectedTime === slot.startTime;
                var btn = document.createElement("button");
                btn.textContent = slot.startTime;

                if (isSelected) {
                    btn.className = "slot-animate w-full py-2.5 md:py-3 rounded-lg border font-bold text-xs md:text-sm transition-all flex items-center justify-center bg-[#dd4d4d] border-[#dd4d4d] text-white";
                } else {
                    btn.className = "slot-animate w-full py-2.5 md:py-3 rounded-lg border font-bold text-xs md:text-sm transition-all flex items-center justify-center border-slate-200 text-[#dd4d4d] hover:border-[#dd4d4d] hover:border-2";
                }

                btn.style.animationDelay = (index * 0.05) + 's';

                btn.addEventListener("click", function () {
                    bookingState.selectedTime = slot.startTime;
                    updateTimeSlotSelection();
                    updateSidebar();
                    updateStep1Button();
                });

                list.appendChild(btn);
            });

            list.style.opacity = '1';
            updateStep1Button();
        }, 200);
    } catch (error) {
        console.error('Error loading slots:', error);
        list.innerHTML = '<p class="text-red-500 text-sm text-center py-8">Error al cargar horarios</p>';
        updateStep1Button();
    }
}

// ==========================================
// STEP 2 VALIDATION
// ==========================================

function showFieldError(id, message) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add('border-red-400');
    el.classList.remove('border-slate-200');
    var errId = id + '-error';
    var existing = document.getElementById(errId);
    if (existing) { existing.textContent = message; existing.classList.remove('hidden'); return; }
    var span = document.createElement('span');
    span.id = errId;
    span.className = 'text-red-500 text-xs mt-1 block';
    span.textContent = message;
    el.parentNode.appendChild(span);
}

function clearFieldError(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('border-red-400');
    el.classList.add('border-slate-200');
    var errEl = document.getElementById(id + '-error');
    if (errEl) errEl.classList.add('hidden');
}

function validateStep2() {
    var name = document.getElementById("booking-name").value.trim();
    var dni = document.getElementById("booking-dni").value.trim();
    var phone = document.getElementById("booking-phone").value.trim();
    var procedure = document.getElementById("booking-procedure").value;
    var btn = document.getElementById("booking-step2-next");
    var valid = true;

    if (!name || name.length < 2) {
        if (name.length > 0) showFieldError('booking-name', 'Ingresa tu nombre completo (mín. 2 caracteres)');
        valid = false;
    } else {
        clearFieldError('booking-name');
    }

    if (!dni || !/^\d{8}$/.test(dni)) {
        if (dni.length > 0) showFieldError('booking-dni', 'El DNI debe tener exactamente 8 dígitos');
        valid = false;
    } else {
        clearFieldError('booking-dni');
    }

    if (!phone || !/^9\d{8}$/.test(phone)) {
        if (phone.length > 0) showFieldError('booking-phone', 'Ingresa un celular válido (9 dígitos, empieza con 9)');
        valid = false;
    } else {
        clearFieldError('booking-phone');
    }

    if (!procedure) {
        valid = false;
    } else {
        clearFieldError('booking-procedure');
    }

    btn.disabled = !valid;
}

function updateStep1Button() {
    var btn = document.getElementById("booking-step1-next");
    if (!btn) return;
    if (bookingState.selectedDate && bookingState.selectedTime) {
        btn.classList.remove("hidden");
        btn.disabled = false;
    } else {
        btn.classList.add("hidden");
        btn.disabled = true;
    }
}

// ==========================================
// SUMMARY (STEP 4)
// ==========================================

function populateSummary() {
    var name = document.getElementById("booking-name").value;
    var procedure = document.getElementById("booking-procedure").value;

    document.querySelector("#summary-name span").textContent = name;
    document.querySelector("#summary-procedure span").textContent = procedure;

    // Date/time population removed to avoid redundancy with sidebar

    // Mostrar método de pago en el resumen
    var methodEl = document.getElementById("summary-payment-method");
    if (methodEl) {
        if (bookingState.paymentMethod === 'yape') {
            methodEl.textContent = "Yape (pendiente de confirmación)";
        } else {
            methodEl.textContent = "Pago presencial en consultorio";
        }
    }

    // Mostrar mensaje según método elegido
    var msgPresencial = document.getElementById("summary-msg-presencial");
    var msgYape = document.getElementById("summary-msg-yape");

    if (msgPresencial && msgYape) {
        if (bookingState.paymentMethod === 'presencial') {
            msgPresencial.classList.remove('hidden');
            msgYape.classList.add('hidden');
        } else {
            msgYape.classList.remove('hidden');
            msgPresencial.classList.add('hidden');
        }
    }
}

// ==========================================
// LISTENERS
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
    var fields = ["booking-name", "booking-dni", "booking-phone", "booking-procedure"];
    fields.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", validateStep2);
            el.addEventListener("change", validateStep2);
        }
    });
});