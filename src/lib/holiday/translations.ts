import { HolidayAgeGroup, HolidayLanguage } from '@/types/holiday';
import { HOLIDAY_EVENT_YEAR } from './constants';

export interface HolidayTranslation {
    appTitle: string;
    programTitle: string;
    registrationTitle: string;
    registrationNotice: string;
    languageLabel: string;

    parentSectionTitle: string;
    parentNameLabel: string;
    parentNamePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;

    howItWorksTitle: string;
    howItWorksImageAlt: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    guidelinesTitle: string;
    guidelineScreenshot: string;
    guidelineArrival: string;
    guidelineHousehold: string;
    cityLabel: string;
    otherCityPlaceholder: string;

    housingLabel: string;
    housingOptions: {
        house_apartment: string;
        vehicle_rv_camper: string;
        temp_shelter_motel: string;
        outside: string;
    };

    incomeLabel: string;
    incomeOptions: {
        '0_40k': string;
        '41_65k': string;
        '66_90k': string;
        'over_90k': string;
    };

    childSectionTitle: string;
    childSectionSubtitle: string;
    childNameLabel: string;
    childNamePlaceholder: string;
    childBirthdateLabel: string;
    childAgeLabel: string;
    childAgeShortLabel: string;
    childSchoolLabel: string;
    childSchoolPlaceholder: string;
    childLimitNotice: string;
    addChildButton: string;
    removeChildButton: string;
    childNumberLabel: string;
    childCountOne: string;
    childCountMany: string;
    childNotInSchoolLabel: string;
    ageGroupLabels: Record<HolidayAgeGroup, string>;

    arrivalInfoTitle: string;
    arrivalInfoNotice: string;
    allSlotsFullNotice: string;

    submitButton: string;
    submittingButton: string;

    confirmationTitle: string;
    confirmationSubtitle: string;
    ticketNumberLabel: string;
    ticketQrTitle: string;
    ticketQrSubtitle: string;
    yourTimeSlot: string;
    eventLocationLabel: string;
    eventLocationValue: string;
    childrenRegisteredTitle: string;
    entitlementsTitle: string;
    groceryCardEntitlement: string;
    teenCardEntitlement: string;
    importantNotesTitle: string;
    importantNotesText: string;
    downloadImageButton: string;
    downloadPdfButton: string;
    savingAction: string;
    generatingAction: string;
    autoSaveNotice: string;
    printTicketButton: string;
    registerAnotherButton: string;

    eventDateLabel: string;
    eventYearLabel: string;
    addToCalendarButton: string;
    directionsButton: string;
    privacyNoticeTitle: string;
    privacyNotice: string;
    duplicateWarning: string;

    findTicketButton: string;
    findTicketTitle: string;
    findTicketDescription: string;
    findTicketPhoneLabel: string;
    findTicketParentNameLabel: string;
    findTicketSubmitButton: string;
    findTicketSearchingButton: string;
    findTicketNotFound: string;
    findTicketMissingFields: string;
    findTicketError: string;
    findTicketResultTitle: string;
    findTicketCloseButton: string;

    errors: {
        parentNameRequired: string;
        phoneRequired: string;
        cityRequired: string;
        atLeastOneChild: string;
        childNameRequired: string;
        childBirthdateRequired: string;
        childBirthdateInvalid: string;
        childSchoolRequired: string;
        childAgeRange: string;
        childOverAge: string;
        childLimitReached: string;
        slotRequired: string;
        allSlotsFull: string;
        slotFull: string;
        rateLimited: string;
        temporarilyUnavailable: string;
        invalidSubmission: string;
        submissionFailed: string;
    };
}

export const HOLIDAY_TRANSLATIONS: Record<HolidayLanguage, HolidayTranslation> = {
    en: {
        appTitle: "Hope's Corner",
        programTitle: `HOPE'S CORNER, INC. ${HOLIDAY_EVENT_YEAR} HOLIDAY TOY DISTRIBUTION`,
        registrationTitle: "Holiday Program Registration",
        registrationNotice: "Parents & legal guardians may register children age 0-18. Do not register children that are not your legal dependents.",
        languageLabel: "Language / Idioma / 语言",

        parentSectionTitle: "Parent / Guardian Information",
        parentNameLabel: "Parent / Guardian Name",
        parentNamePlaceholder: "e.g. Maria Gonzalez",
        phoneLabel: "Phone Number",
        phonePlaceholder: "e.g. (650) 555-0123",

        howItWorksTitle: "How It Works",
        howItWorksImageAlt: "Three steps: register, get your ticket, pick up gifts",
        step1Title: "Register",
        step1Desc: "Add your name, phone, and each child (0–18).",
        step2Title: "Get Your Ticket",
        step2Desc: "Get your arrival time and QR code right away.",
        step3Title: "Pick Up Gifts",
        step3Desc: "Come on event day. A volunteer will help you.",
        guidelinesTitle: "Good to Know",
        guidelineScreenshot: "Save a photo of your QR ticket.",
        guidelineArrival: "Come 10 minutes early.",
        guidelineHousehold: "One sign-up per family. Ages 0–18 only.",
        cityLabel: "City of Residence",
        otherCityPlaceholder: "Enter your city",

        housingLabel: "Housing Status",
        housingOptions: {
            house_apartment: "House / Apartment",
            vehicle_rv_camper: "Vehicle / RV / Camper",
            temp_shelter_motel: "Temporary Shelter / Motel",
            outside: "Outside / Unhoused",
        },

        incomeLabel: "Total Annual Family Income",
        incomeOptions: {
            '0_40k': "$0 – $40,000",
            '41_65k': "$41,000 – $65,000",
            '66_90k': "$66,000 – $90,000",
            'over_90k': "Over $90,000",
        },

        childSectionTitle: "Child Information",
        childSectionSubtitle: "Register each dependent child (ages 0–18)",
        childNameLabel: "Child's Full Name",
        childNamePlaceholder: "e.g. Alexander Gonzalez",
        childBirthdateLabel: "Birthdate",
        childAgeLabel: "Age (0–18)",
        childAgeShortLabel: "Age",
        childSchoolLabel: "School Name",
        childSchoolPlaceholder: "e.g. Mountain View High",
        childLimitNotice: "Families with more than 3 children must register in person at the Hope's Corner table. Online registration is not available for families with more than 3 children.",
        addChildButton: "Add Another Child",
        removeChildButton: "Remove",
        childNumberLabel: "Child",
        childCountOne: "{count} Child",
        childCountMany: "{count} Children",
        childNotInSchoolLabel: "Not in school yet",
        ageGroupLabels: {
            infant: "Infant (0-1)",
            toddler: "Toddler (1-4)",
            child: "Child (5-12)",
            teen_13: "Teen (13)",
            teen_14: "Teen (14)",
            teen_15: "Teen (15)",
            teen_16_18: "Teen (16-18)",
        },

        arrivalInfoTitle: "Automatic Arrival Window",
        arrivalInfoNotice: "To ensure minimal wait times and smooth distribution, your 20-minute arrival window (between 09:00 AM – 02:00 PM) and ticket number will be automatically assigned upon registration.",
        allSlotsFullNotice: "All arrival windows are currently at full capacity for this event.",

        submitButton: "Complete Registration & Get Ticket",
        submittingButton: "Registering...",

        confirmationTitle: "Registration Confirmed!",
        confirmationSubtitle: "Please take a screenshot or print this ticket for check-in on event day.",
        ticketNumberLabel: "Ticket Number",
        ticketQrTitle: "Official Event Check-In QR Code",
        ticketQrSubtitle: "Show this secure QR code to staff upon arrival for instant check-in",
        yourTimeSlot: "Assigned Time Slot",
        eventLocationLabel: "Event Location",
        eventLocationValue: "Hope's Corner (Trinity United Methodist Church), 748 Mercy St, Mountain View, CA 94041",
        childrenRegisteredTitle: "Registered Children",
        entitlementsTitle: "Eligible Items Summary",
        groceryCardEntitlement: "1 Family Grocery Card",
        teenCardEntitlement: "Teen Gift Card(s) (Ages 14–18)",
        importantNotesTitle: "Important Event Day Instructions",
        importantNotesText: "Please arrive 10 minutes before your assigned time slot and bring your ticket confirmation on your phone.",
        downloadImageButton: "Save / Download Image",
        downloadPdfButton: "Download PDF",
        savingAction: "Saving...",
        generatingAction: "Generating...",
        autoSaveNotice: "Your ticket image is saving automatically. If it does not appear in your downloads or photos, tap Save / Download Image.",
        printTicketButton: "Print Ticket",
        registerAnotherButton: "Register Another Family",

        eventDateLabel: "Event Date",
        eventYearLabel: "Event Year",
        addToCalendarButton: "Add to Calendar",
        directionsButton: "Get Directions",
        privacyNoticeTitle: "How We Use Your Information",
        privacyNotice: "We use the information you provide only to register your family for the holiday program and prepare gifts. We do not sell or share it.",
        duplicateWarning: "This phone number may already be registered. If you already have a ticket, use Find My Ticket instead of registering again.",

        findTicketButton: "Already registered? Find My Ticket",
        findTicketTitle: "Find My Ticket",
        findTicketDescription: "Enter the phone number and parent/guardian name you used to register.",
        findTicketPhoneLabel: "Phone Number",
        findTicketParentNameLabel: "Parent / Guardian Name",
        findTicketSubmitButton: "Find Ticket",
        findTicketSearchingButton: "Searching...",
        findTicketNotFound: "We could not find a ticket with that phone number and parent name. Check the spelling and try again.",
        findTicketMissingFields: "Please enter both the phone number and the parent/guardian name.",
        findTicketError: "We could not look up your ticket right now. Please try again.",
        findTicketResultTitle: "Your Ticket",
        findTicketCloseButton: "Close",

        errors: {
            parentNameRequired: "Please enter the parent/guardian full name.",
            phoneRequired: "Please enter a valid phone number.",
            cityRequired: "Please select or specify your city.",
            atLeastOneChild: "Please add at least one child (age 0–18).",
            childNameRequired: "Please enter the child's name.",
            childBirthdateRequired: "Please enter the child's birthdate.",
            childBirthdateInvalid: "Please enter a valid birthdate that is not in the future.",
            childSchoolRequired: "Please enter the school name for each child.",
            childAgeRange: "Age must be between 0 and 18 years old.",
            childOverAge: "{name} is older than 18 and is not eligible. This program is only for children age 18 or younger.",
            childLimitReached: "Families with more than 3 children must register in person at the Hope's Corner table. Online registration is not available for families with more than 3 children.",
            slotRequired: "Please select an available time slot.",
            allSlotsFull: "All arrival time slots are at full capacity. Registration is currently closed.",
            slotFull: "The specified time slot is full. Please pick another slot.",
            rateLimited: "Too many attempts. Please wait a few minutes and try again.",
            temporarilyUnavailable: "Registration is temporarily unavailable. Please try again shortly.",
            invalidSubmission: "Invalid submission. Please check your information and try again.",
            submissionFailed: "Failed to submit registration. Please verify your info and try again.",
        },
    },

    es: {
        appTitle: "Hope's Corner",
        programTitle: `HOPE'S CORNER, INC. DISTRIBUCIÓN DE JUGUETES NAVIDEÑOS ${HOLIDAY_EVENT_YEAR}`,
        registrationTitle: "Registro para el Programa Navideño",
        registrationNotice: "Los padres y tutores legales pueden inscribir a niños de 0 a 18 años. No registre a niños que no sean sus dependientes legales.",
        languageLabel: "Idioma / Language / 语言",

        parentSectionTitle: "Información del Padre / Tutor",
        parentNameLabel: "Nombre del Padre / Tutor",
        parentNamePlaceholder: "ej. María González",
        phoneLabel: "Número de Teléfono",
        phonePlaceholder: "ej. (650) 555-0123",

        howItWorksTitle: "Cómo Funciona",
        howItWorksImageAlt: "Tres pasos: regístrese, reciba su boleto, recoja regalos",
        step1Title: "Regístrese",
        step1Desc: "Agregue su nombre, teléfono y cada niño (0–18).",
        step2Title: "Reciba Su Boleto",
        step2Desc: "Reciba su hora de llegada y código QR.",
        step3Title: "Recoja Regalos",
        step3Desc: "Venga el día del evento. Un voluntario le ayuda.",
        guidelinesTitle: "Importante",
        guidelineScreenshot: "Guarde una foto de su boleto QR.",
        guidelineArrival: "Llegue 10 minutos antes.",
        guidelineHousehold: "Un registro por familia. Edades 0–18.",
        cityLabel: "Ciudad de Residencia",
        otherCityPlaceholder: "Ingrese su ciudad",

        housingLabel: "Situación de Vivienda",
        housingOptions: {
            house_apartment: "Casa / Apartamento",
            vehicle_rv_camper: "Vehículo / RV / Casa Rodante",
            temp_shelter_motel: "Refugio Temporal / Motel",
            outside: "Al aire libre / Sin hogar",
        },

        incomeLabel: "Ingreso Familiar Anual Total",
        incomeOptions: {
            '0_40k': "$0 – $40,000",
            '41_65k': "$41,000 – $65,000",
            '66_90k': "$66,000 – $90,000",
            'over_90k': "Más de $90,000",
        },

        childSectionTitle: "Información de los Niños",
        childSectionSubtitle: "Inscriba a cada hijo o dependiente legal (edades 0–18)",
        childNameLabel: "Nombre Completo del Niño/a",
        childNamePlaceholder: "ej. Alexander González",
        childBirthdateLabel: "Fecha de Nacimiento",
        childAgeLabel: "Edad (0–18)",
        childAgeShortLabel: "Edad",
        childSchoolLabel: "Nombre de la Escuela",
        childSchoolPlaceholder: "ej. Mountain View High",
        childLimitNotice: "Las familias con más de 3 niños deben registrarse en persona en la mesa de Hope's Corner. El registro en línea no está disponible para familias con más de 3 niños.",
        addChildButton: "Agregar Otro Niño/a",
        removeChildButton: "Eliminar",
        childNumberLabel: "Niño/a",
        childCountOne: "{count} Niño",
        childCountMany: "{count} Niños",
        childNotInSchoolLabel: "Aún no asiste a la escuela",
        ageGroupLabels: {
            infant: "Bebé (0-1)",
            toddler: "Niño pequeño (1-4)",
            child: "Niño/a (5-12)",
            teen_13: "Adolescente (13)",
            teen_14: "Adolescente (14)",
            teen_15: "Adolescente (15)",
            teen_16_18: "Adolescente (16-18)",
        },

        arrivalInfoTitle: "Horario de Llegada Automático",
        arrivalInfoNotice: "Para garantizar tiempos de espera mínimos y una distribución organizada, su ventana de llegada de 20 minutos (entre 09:00 AM – 02:00 PM) y su número de boleto se asignarán automáticamente al registrarse.",
        allSlotsFullNotice: "Todos los horarios de llegada están completos para este evento.",

        submitButton: "Completar Registro y Obtener Boleto",
        submittingButton: "Registrando...",

        confirmationTitle: "¡Registro Confirmado!",
        confirmationSubtitle: "Tome una captura de pantalla o imprima este boleto para el día del evento.",
        ticketNumberLabel: "Número de Boleto",
        ticketQrTitle: "Código QR Oficial de Registro",
        ticketQrSubtitle: "Muestre este código seguro al personal a su llegada para registrarse al instante",
        yourTimeSlot: "Horario Asignado",
        eventLocationLabel: "Ubicación del Evento",
        eventLocationValue: "Hope's Corner (Iglesia Trinity United Methodist), 748 Mercy St, Mountain View, CA 94041",
        childrenRegisteredTitle: "Niños Registrados",
        entitlementsTitle: "Resumen de Artículos Asignados",
        groceryCardEntitlement: "1 Tarjeta de Supermercado Familiar",
        teenCardEntitlement: "Tarjeta(s) de Regalo para Adolescentes (14–18 años)",
        importantNotesTitle: "Instrucciones Importantes para el Evento",
        importantNotesText: "Por favor llegue 10 minutos antes de su horario asignado y traiga la confirmación de su boleto en su teléfono.",
        downloadImageButton: "Guardar / Descargar Imagen",
        downloadPdfButton: "Descargar PDF",
        savingAction: "Guardando...",
        generatingAction: "Generando...",
        autoSaveNotice: "La imagen de su boleto se está guardando automáticamente. Si no aparece en sus descargas o fotos, toque Guardar / Descargar Imagen.",
        printTicketButton: "Imprimir Boleto",
        registerAnotherButton: "Registrar Otra Familia",

        eventDateLabel: "Fecha del Evento",
        eventYearLabel: "Año del Evento",
        addToCalendarButton: "Agregar al Calendario",
        directionsButton: "Cómo Llegar",
        privacyNoticeTitle: "Cómo Usamos Su Información",
        privacyNotice: "Usamos la información que proporciona solo para inscribir a su familia en el programa navideño y preparar los regalos. No la vendemos ni la compartimos.",
        duplicateWarning: "Es posible que este número de teléfono ya esté registrado. Si ya tiene un boleto, use Buscar Mi Boleto en lugar de registrarse de nuevo.",

        findTicketButton: "¿Ya se registró? Buscar Mi Boleto",
        findTicketTitle: "Buscar Mi Boleto",
        findTicketDescription: "Ingrese el número de teléfono y el nombre del padre o tutor que usó para registrarse.",
        findTicketPhoneLabel: "Número de Teléfono",
        findTicketParentNameLabel: "Nombre del Padre / Tutor",
        findTicketSubmitButton: "Buscar Boleto",
        findTicketSearchingButton: "Buscando...",
        findTicketNotFound: "No encontramos un boleto con ese teléfono y nombre. Revise la información e intente de nuevo.",
        findTicketMissingFields: "Por favor ingrese el número de teléfono y el nombre del padre o tutor.",
        findTicketError: "No pudimos buscar su boleto en este momento. Por favor intente de nuevo.",
        findTicketResultTitle: "Su Boleto",
        findTicketCloseButton: "Cerrar",

        errors: {
            parentNameRequired: "Por favor ingrese el nombre del padre o tutor.",
            phoneRequired: "Por favor ingrese un número de teléfono válido.",
            cityRequired: "Por favor seleccione su ciudad.",
            atLeastOneChild: "Por favor agregue al menos un niño/a (edad 0–18).",
            childNameRequired: "Por favor ingrese el nombre del niño/a.",
            childBirthdateRequired: "Por favor ingrese la fecha de nacimiento del niño/a.",
            childBirthdateInvalid: "Por favor ingrese una fecha de nacimiento válida que no esté en el futuro.",
            childSchoolRequired: "Por favor ingrese el nombre de la escuela de cada niño/a.",
            childAgeRange: "La edad debe estar entre 0 y 18 años.",
            childOverAge: "{name} tiene más de 18 años y no es elegible. Este programa es solo para jóvenes de 18 años o menos.",
            childLimitReached: "Las familias con más de 3 niños deben registrarse en persona en la mesa de Hope's Corner. El registro en línea no está disponible para familias con más de 3 niños.",
            slotRequired: "Por favor seleccione un horario disponible.",
            allSlotsFull: "Todos los horarios están llenos. El registro está cerrado actualmente.",
            slotFull: "Ese horario está lleno. Intente de nuevo para obtener el próximo horario disponible.",
            rateLimited: "Demasiados intentos. Por favor espere unos minutos e intente de nuevo.",
            temporarilyUnavailable: "El registro no está disponible temporalmente. Por favor intente de nuevo en breve.",
            invalidSubmission: "No pudimos procesar el registro. Revise su información e intente de nuevo.",
            submissionFailed: "Error al enviar el registro. Por favor revise sus datos e intente de nuevo.",
        },
    },

    zh: {
        appTitle: "Hope's Corner",
        programTitle: `HOPE'S CORNER ${HOLIDAY_EVENT_YEAR}年度节日玩具分发活动`,
        registrationTitle: "节日活动登记表",
        registrationNotice: "父母及法定监护人可为0至18岁的子女进行登记。请勿登记非直系受抚养儿童。",
        languageLabel: "语言 / Language / Idioma",

        parentSectionTitle: "家长 / 监护人信息",
        parentNameLabel: "家长 / 监护人姓名",
        parentNamePlaceholder: "例：张三 / San Zhang",
        phoneLabel: "联系电话",
        phonePlaceholder: "例：(650) 555-0123",

        howItWorksTitle: "活动流程",
        howItWorksImageAlt: "三步流程：登记、领取凭证、领取礼物",
        step1Title: "登记",
        step1Desc: "填写姓名、电话和每位孩子（0–18岁）。",
        step2Title: "领取凭证",
        step2Desc: "立即获取到场时间和二维码。",
        step3Title: "领取礼物",
        step3Desc: "活动当天前来，有志愿者帮助您。",
        guidelinesTitle: "注意事项",
        guidelineScreenshot: "保存二维码票据照片。",
        guidelineArrival: "请提前10分钟到达。",
        guidelineHousehold: "每个家庭登记一次，仅限0–18岁。",
        cityLabel: "居住城市",
        otherCityPlaceholder: "请输入所在城市",

        housingLabel: "住房情况",
        housingOptions: {
            house_apartment: "住宅 / 公寓",
            vehicle_rv_camper: "房车 / 车辆 / 露营车",
            temp_shelter_motel: "临时庇护所 / 汽车旅馆",
            outside: "无住所 / 露宿",
        },

        incomeLabel: "家庭年总收入",
        incomeOptions: {
            '0_40k': "$0 – $40,000",
            '41_65k': "$41,000 – $65,000",
            '66_90k': "$66,000 – $90,000",
            'over_90k': "$90,000 以上",
        },

        childSectionTitle: "儿童信息",
        childSectionSubtitle: "请添加家庭中所有受抚养的子女（0–18岁）",
        childNameLabel: "儿童姓名",
        childNamePlaceholder: "例：Alexander Zhang",
        childBirthdateLabel: "出生日期",
        childAgeLabel: "年龄 (0–18)",
        childAgeShortLabel: "年龄",
        childSchoolLabel: "就读学校",
        childSchoolPlaceholder: "例：Mountain View High",
        childLimitNotice: "有超过3名儿童的家庭请前往Hope's Corner服务台现场登记。此在线登记表不适用于有超过3名儿童的家庭。",
        addChildButton: "添加另一位儿童",
        removeChildButton: "删除",
        childNumberLabel: "儿童",
        childCountOne: "{count} 名儿童",
        childCountMany: "{count} 名儿童",
        childNotInSchoolLabel: "尚未入学",
        ageGroupLabels: {
            infant: "婴儿 (0-1)",
            toddler: "幼儿 (1-4)",
            child: "儿童 (5-12)",
            teen_13: "青少年 (13)",
            teen_14: "青少年 (14)",
            teen_15: "青少年 (15)",
            teen_16_18: "青少年 (16-18)",
        },

        arrivalInfoTitle: "自动分配到场时间段",
        arrivalInfoNotice: "为减少现场等待时间并保障分发顺畅，系统将在提交登记后自动为您分配 20 分钟的到场时间段（上午 09:00 至 下午 02:00 之间）及入场票号。",
        allSlotsFullNotice: "本次活动的所有入场时间段名额均已满。",

        submitButton: "提交登记并获取票号",
        submittingButton: "正在提交...",

        confirmationTitle: "登记成功！",
        confirmationSubtitle: "请截图或打印此入场凭证，以便在活动当天签到使用。",
        ticketNumberLabel: "凭证票号",
        ticketQrTitle: "官方入场签到二维码",
        ticketQrSubtitle: "到达现场时请向工作人员出示此安全二维码以便快速签到",
        yourTimeSlot: "已分配时间段",
        eventLocationLabel: "活动地点",
        eventLocationValue: "Hope's Corner (Trinity United Methodist Church), 748 Mercy St, Mountain View, CA 94041",
        childrenRegisteredTitle: "已登记儿童",
        entitlementsTitle: "应领物品明细",
        groceryCardEntitlement: "家庭食品杂货卡 1 张",
        teenCardEntitlement: "青少年礼品卡（14–18岁）",
        importantNotesTitle: "活动当天重要须知",
        importantNotesText: "请在您被分配的时间段前 10 分钟到达，并出示手机上的凭证确认页面。",
        downloadImageButton: "保存 / 下载图片",
        downloadPdfButton: "下载 PDF",
        savingAction: "正在保存...",
        generatingAction: "正在生成...",
        autoSaveNotice: "票券图片正在自动保存。如果没有出现在下载或相册中，请点击“保存 / 下载图片”。",
        printTicketButton: "打印门票",
        registerAnotherButton: "登记另一个家庭",

        eventDateLabel: "活动日期",
        eventYearLabel: "活动年份",
        addToCalendarButton: "添加到日历",
        directionsButton: "获取路线",
        privacyNoticeTitle: "我们如何使用您的信息",
        privacyNotice: "我们仅使用您提供的信息为您的家庭登记节日活动并准备礼物，不会出售或分享这些信息。",
        duplicateWarning: "此电话号码可能已经登记。如果您已有票号，请使用“查找我的票号”，无需再次登记。",

        findTicketButton: "已经登记？查找我的票号",
        findTicketTitle: "查找我的票号",
        findTicketDescription: "请输入登记时使用的电话号码和家长/监护人姓名。",
        findTicketPhoneLabel: "联系电话",
        findTicketParentNameLabel: "家长 / 监护人姓名",
        findTicketSubmitButton: "查找票号",
        findTicketSearchingButton: "正在查找...",
        findTicketNotFound: "未找到与该电话号码和家长姓名匹配的票号。请检查后重试。",
        findTicketMissingFields: "请输入电话号码和家长/监护人姓名。",
        findTicketError: "目前无法查找您的票号。请重试。",
        findTicketResultTitle: "您的票号",
        findTicketCloseButton: "关闭",

        errors: {
            parentNameRequired: "请输入家长/监护人姓名。",
            phoneRequired: "请输入有效的电话号码。",
            cityRequired: "请选择或输入所在城市。",
            atLeastOneChild: "请至少添加一名儿童（0–18岁）。",
            childNameRequired: "请输入儿童姓名。",
            childBirthdateRequired: "请输入儿童出生日期。",
            childBirthdateInvalid: "请输入有效的出生日期，日期不能晚于今天。",
            childSchoolRequired: "请输入每位儿童的学校名称。",
            childAgeRange: "儿童年龄须在 0 至 18 岁之间。",
            childOverAge: "{name}已超过18岁，不符合资格。本活动仅限18岁及以下青少年参加。",
            childLimitReached: "有超过3名儿童的家庭请前往Hope's Corner服务台现场登记。此在线登记表不适用于有超过3名儿童的家庭。",
            slotRequired: "请选择一个有效的时间段。",
            allSlotsFull: "所有到场时间段均已满额，登记通道已关闭。",
            slotFull: "该时间段已满。请重试以获取下一个可用时间段。",
            rateLimited: "尝试次数过多。请等待几分钟后重试。",
            temporarilyUnavailable: "登记服务暂时不可用。请稍后重试。",
            invalidSubmission: "无法处理此登记。请检查信息后重试。",
            submissionFailed: "提交登记失败，请检查填写信息后重试。",
        },
    },
};
