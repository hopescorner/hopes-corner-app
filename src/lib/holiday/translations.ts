import { HolidayLanguage } from '@/types/holiday';
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
    childSchoolLabel: string;
    childSchoolPlaceholder: string;
    addChildButton: string;
    removeChildButton: string;
    childNumberLabel: string;

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
    printTicketButton: string;
    registerAnotherButton: string;

    errors: {
        parentNameRequired: string;
        phoneRequired: string;
        cityRequired: string;
        atLeastOneChild: string;
        childNameRequired: string;
        childBirthdateRequired: string;
        childAgeRange: string;
        slotRequired: string;
        allSlotsFull: string;
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

        howItWorksTitle: "How Registration & Event Day Works",
        step1Title: "1. Register Your Family",
        step1Desc: "Provide your contact info and add each dependent child with their birthdate (age will auto-calculate).",
        step2Title: "2. Receive Arrival Ticket",
        step2Desc: "You will be assigned a 20-minute arrival window and an official check-in QR code immediately.",
        step3Title: "3. Shop with a Volunteer",
        step3Desc: "On event day, a volunteer personal shopper will guide you to select gifts for your children.",
        guidelinesTitle: "Helpful Registration Instructions & Guidelines",
        guidelineScreenshot: "Save or screenshot your ticket QR code on your phone right after submitting.",
        guidelineArrival: "Please arrive 10 minutes before your assigned arrival window at Hope's Corner.",
        guidelineHousehold: "Please register each dependent child living in your household (ages 0–18). One registration per family.",
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
        childSchoolLabel: "School (Optional)",
        childSchoolPlaceholder: "e.g. Mountain View High",
        addChildButton: "Add Another Child",
        removeChildButton: "Remove",
        childNumberLabel: "Child",

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
        printTicketButton: "Print Ticket",
        registerAnotherButton: "Register Another Family",

        errors: {
            parentNameRequired: "Please enter the parent/guardian full name.",
            phoneRequired: "Please enter a valid phone number.",
            cityRequired: "Please select or specify your city.",
            atLeastOneChild: "Please add at least one child (age 0–18).",
            childNameRequired: "Please enter the child's name.",
            childBirthdateRequired: "Please enter the child's birthdate.",
            childAgeRange: "Age must be between 0 and 18 years old.",
            slotRequired: "Please select an available time slot.",
            allSlotsFull: "All arrival time slots are full. Registration is currently closed.",
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

        howItWorksTitle: "Cómo Funciona el Registro y el Día del Evento",
        step1Title: "1. Inscriba a su Familia",
        step1Desc: "Ingrese sus datos de contacto y agregue a cada hijo/a con su fecha de nacimiento (la edad se calculará automáticamente).",
        step2Title: "2. Reciba su Horario y Boleto",
        step2Desc: "Se le asignará de inmediato un horario de llegada de 20 minutos y su código QR oficial de registro.",
        step3Title: "3. Elija Regalos con un Voluntario",
        step3Desc: "El día del evento, un voluntario le ayudará personalmente a elegir los regalos para sus hijos.",
        guidelinesTitle: "Instrucciones Útiles y Pautas de Registro",
        guidelineScreenshot: "Guarde o tome una captura de pantalla del código QR de su boleto después de registrarse.",
        guidelineArrival: "Por favor llegue 10 minutos antes de su horario asignado a Hope's Corner.",
        guidelineHousehold: "Por favor inscriba a cada hijo/a dependiente que viva en su hogar (0 a 18 años). Un registro por familia.",
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
        childSchoolLabel: "Escuela (Opcional)",
        childSchoolPlaceholder: "ej. Mountain View High",
        addChildButton: "Agregar Otro Niño/a",
        removeChildButton: "Eliminar",
        childNumberLabel: "Niño/a",

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
        printTicketButton: "Imprimir Boleto",
        registerAnotherButton: "Registrar Otra Familia",

        errors: {
            parentNameRequired: "Por favor ingrese el nombre del padre o tutor.",
            phoneRequired: "Por favor ingrese un número de teléfono válido.",
            cityRequired: "Por favor seleccione su ciudad.",
            atLeastOneChild: "Por favor agregue al menos un niño/a (edad 0–18).",
            childNameRequired: "Por favor ingrese el nombre del niño/a.",
            childBirthdateRequired: "Por favor ingrese la fecha de nacimiento del niño/a.",
            childAgeRange: "La edad debe estar entre 0 y 18 años.",
            slotRequired: "Por favor seleccione un horario disponible.",
            allSlotsFull: "Todos los horarios están llenos. El registro está cerrado actualmente.",
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

        howItWorksTitle: "活动登记与参与流程说明",
        step1Title: "1. 填写家庭信息",
        step1Desc: "填写家长联系方式，并输入每位受抚养子女的出生日期（系统将自动计算年龄）。",
        step2Title: "2. 获取入场时间与凭证",
        step2Desc: "提交后系统将即时自动分配20分钟到场时段与官方入场签到二维码。",
        step3Title: "3. 志愿者协助现场挑选",
        step3Desc: "活动当天到达现场签到后，将有专属志愿者陪同为您孩子挑选心仪的节日礼物。",
        guidelinesTitle: "温馨登记须知与提示",
        guidelineScreenshot: "登记成功后，请立即在手机上截图保存或打印您的确认票据及二维码。",
        guidelineArrival: "请在您被分配的时间段前 10 分钟到达 Hope's Corner 现场办理签到。",
        guidelineHousehold: "请为您家中共同居住的每位受抚养子女（0–18岁）进行登记，每个家庭仅限登记一次。",
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
        childSchoolLabel: "就读学校（选填）",
        childSchoolPlaceholder: "例：Mountain View High",
        addChildButton: "添加另一位儿童",
        removeChildButton: "删除",
        childNumberLabel: "儿童",

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
        printTicketButton: "打印门票",
        registerAnotherButton: "登记另一个家庭",

        errors: {
            parentNameRequired: "请输入家长/监护人姓名。",
            phoneRequired: "请输入有效的电话号码。",
            cityRequired: "请选择或输入所在城市。",
            atLeastOneChild: "请至少添加一名儿童（0–18岁）。",
            childNameRequired: "请输入儿童姓名。",
            childBirthdateRequired: "请输入儿童出生日期。",
            childAgeRange: "儿童年龄须在 0 至 18 岁之间。",
            slotRequired: "请选择一个有效的时间段。",
            allSlotsFull: "所有到场时间段均已满额，登记通道已关闭。",
            submissionFailed: "提交登记失败，请检查填写信息后重试。",
        },
    },
};

