// ============================================
// TECSITEL V.3 - MÓDULOS AVANZADOS
// Archivo: modules/advanced-modules.js
// ============================================

// ========================================
// 1. PLAN CONTABLE GENERAL EMPRESARIAL (PCGE)
// ========================================

const PLAN_CONTABLE = {
  // ELEMENTO 1: ACTIVO DISPONIBLE Y EXIGIBLE
  "10": { codigo: "10", nombre: "EFECTIVO Y EQUIVALENTES DE EFECTIVO", nivel: 2 },
  "101": { codigo: "101", nombre: "Caja", nivel: 3, padre: "10" },
  "1011": { codigo: "1011", nombre: "Caja MN", nivel: 4, padre: "101" },
  "1012": { codigo: "1012", nombre: "Caja ME", nivel: 4, padre: "101" },
  "104": { codigo: "104", nombre: "Cuentas corrientes en instituciones financieras", nivel: 3, padre: "10" },
  "1041": { codigo: "1041", nombre: "Cuentas corrientes operativas", nivel: 4, padre: "104" },
  "106": { codigo: "106", nombre: "Depósitos en instituciones financieras", nivel: 3, padre: "10" },
  "1061": { codigo: "1061", nombre: "Depósitos de ahorro", nivel: 4, padre: "106" },
  "107": { codigo: "107", nombre: "Fondos sujetos a restricción", nivel: 3, padre: "10" },
  
  "12": { codigo: "12", nombre: "CUENTAS POR COBRAR COMERCIALES – TERCEROS", nivel: 2 },
  "121": { codigo: "121", nombre: "Facturas, boletas y otros comprobantes por cobrar", nivel: 3, padre: "12" },
  "1212": { codigo: "1212", nombre: "Emitidas en cartera", nivel: 4, padre: "121" },
  "1213": { codigo: "1213", nombre: "En cobranza", nivel: 4, padre: "121" },
  "1214": { codigo: "1214", nombre: "En descuento", nivel: 4, padre: "121" },
  "122": { codigo: "122", nombre: "Anticipos de clientes", nivel: 3, padre: "12" },
  "123": { codigo: "123", nombre: "Letras por cobrar", nivel: 3, padre: "12" },
  "1231": { codigo: "1231", nombre: "En cartera", nivel: 4, padre: "123" },
  "1232": { codigo: "1232", nombre: "En cobranza", nivel: 4, padre: "123" },
  "1233": { codigo: "1233", nombre: "En descuento", nivel: 4, padre: "123" },
  
  "16": { codigo: "16", nombre: "CUENTAS POR COBRAR DIVERSAS – TERCEROS", nivel: 2 },
  "161": { codigo: "161", nombre: "Préstamos", nivel: 3, padre: "16" },
  "162": { codigo: "162", nombre: "Reclamaciones a terceros", nivel: 3, padre: "16" },
  "163": { codigo: "163", nombre: "Intereses por cobrar", nivel: 3, padre: "16" },
  "164": { codigo: "164", nombre: "Depósitos otorgados en garantía", nivel: 3, padre: "16" },
  "168": { codigo: "168", nombre: "Otras cuentas por cobrar diversas", nivel: 3, padre: "16" },
  "169": { codigo: "169", nombre: "Cobranza dudosa", nivel: 3, padre: "16" },
  
  // ELEMENTO 2: ACTIVO REALIZABLE
  "20": { codigo: "20", nombre: "MERCADERÍAS", nivel: 2 },
  "201": { codigo: "201", nombre: "Mercaderías manufacturadas", nivel: 3, padre: "20" },
  "2011": { codigo: "2011", nombre: "Mercaderías manufacturadas - Costo", nivel: 4, padre: "201" },
  "208": { codigo: "208", nombre: "Otras mercaderías", nivel: 3, padre: "20" },
  
  "21": { codigo: "21", nombre: "PRODUCTOS TERMINADOS", nivel: 2 },
  "211": { codigo: "211", nombre: "Productos manufacturados", nivel: 3, padre: "21" },
  "212": { codigo: "212", nombre: "Productos de extracción terminados", nivel: 3, padre: "21" },
  "213": { codigo: "213", nombre: "Productos agropecuarios y piscícolas terminados", nivel: 3, padre: "21" },
  "214": { codigo: "214", nombre: "Productos inmuebles", nivel: 3, padre: "21" },
  
  // ELEMENTO 3: ACTIVO INMOVILIZADO
  "33": { codigo: "33", nombre: "INMUEBLES, MAQUINARIA Y EQUIPO", nivel: 2 },
  "331": { codigo: "331", nombre: "Terrenos", nivel: 3, padre: "33" },
  "3311": { codigo: "3311", nombre: "Terrenos", nivel: 4, padre: "331" },
  "332": { codigo: "332", nombre: "Edificaciones", nivel: 3, padre: "33" },
  "3321": { codigo: "3321", nombre: "Edificaciones - Costo de adquisición o producción", nivel: 4, padre: "332" },
  "333": { codigo: "333", nombre: "Maquinarias y equipos de explotación", nivel: 3, padre: "33" },
  "3331": { codigo: "3331", nombre: "Maquinarias y equipos de explotación - Costo", nivel: 4, padre: "333" },
  "334": { codigo: "334", nombre: "Unidades de transporte", nivel: 3, padre: "33" },
  "3341": { codigo: "3341", nombre: "Vehículos motorizados", nivel: 4, padre: "334" },
  "335": { codigo: "335", nombre: "Muebles y enseres", nivel: 3, padre: "33" },
  "3351": { codigo: "3351", nombre: "Muebles", nivel: 4, padre: "335" },
  "3352": { codigo: "3352", nombre: "Enseres", nivel: 4, padre: "335" },
  "336": { codigo: "336", nombre: "Equipos diversos", nivel: 3, padre: "33" },
  "3361": { codigo: "3361", nombre: "Equipo para procesamiento de información", nivel: 4, padre: "336" },
  "3362": { codigo: "3362", nombre: "Equipo de comunicación", nivel: 4, padre: "336" },
  "3363": { codigo: "3363", nombre: "Equipo de seguridad", nivel: 4, padre: "336" },
  
  // ELEMENTO 4: PASIVO
  "40": { codigo: "40", nombre: "TRIBUTOS, CONTRAPRESTACIONES Y APORTES AL SISTEMA DE PENSIONES Y DE SALUD POR PAGAR", nivel: 2 },
  "401": { codigo: "401", nombre: "Gobierno central", nivel: 3, padre: "40" },
  "4011": { codigo: "4011", nombre: "Impuesto general a las ventas", nivel: 4, padre: "401" },
  "40111": { codigo: "40111", nombre: "IGV - Cuenta propia", nivel: 5, padre: "4011" },
  "40112": { codigo: "40112", nombre: "IGV - Servicios prestados por no domiciliados", nivel: 5, padre: "4011" },
  "4017": { codigo: "4017", nombre: "Impuesto a la renta", nivel: 4, padre: "401" },
  "40171": { codigo: "40171", nombre: "Renta de tercera categoría", nivel: 5, padre: "4017" },
  "40172": { codigo: "40172", nombre: "Renta de cuarta categoría", nivel: 5, padre: "4017" },
  "40173": { codigo: "40173", nombre: "Renta de quinta categoría", nivel: 5, padre: "4017" },
  "4018": { codigo: "4018", nombre: "Otros impuestos", nivel: 4, padre: "401" },
  "40181": { codigo: "40181", nombre: "Impuesto temporal a los activos netos", nivel: 5, padre: "4018" },
  "40182": { codigo: "40182", nombre: "Impuesto a las transacciones financieras", nivel: 5, padre: "4018" },
  "40183": { codigo: "40183", nombre: "Impuesto extraordinario de solidaridad", nivel: 5, padre: "4018" },
  
  "403": { codigo: "403", nombre: "Instituciones públicas", nivel: 3, padre: "40" },
  "4031": { codigo: "4031", nombre: "EsSalud", nivel: 4, padre: "403" },
  "4032": { codigo: "4032", nombre: "ONP", nivel: 4, padre: "403" },
  "4033": { codigo: "4033", nombre: "Contribución al SENATI", nivel: 4, padre: "403" },
  "4034": { codigo: "4034", nombre: "Contribución al SENCICO", nivel: 4, padre: "403" },
  
  "407": { codigo: "407", nombre: "Administradoras de fondos de pensiones", nivel: 3, padre: "40" },
  "4071": { codigo: "4071", nombre: "AFP - Aportes", nivel: 4, padre: "407" },
  "4072": { codigo: "4072", nombre: "AFP - Prima de seguros", nivel: 4, padre: "407" },
  "4073": { codigo: "4073", nombre: "AFP - Comisiones", nivel: 4, padre: "407" },
  
  "41": { codigo: "41", nombre: "REMUNERACIONES Y PARTICIPACIONES POR PAGAR", nivel: 2 },
  "411": { codigo: "411", nombre: "Remuneraciones por pagar", nivel: 3, padre: "41" },
  "4111": { codigo: "4111", nombre: "Sueldos y salarios por pagar", nivel: 4, padre: "411" },
  "4112": { codigo: "4112", nombre: "Comisiones por pagar", nivel: 4, padre: "411" },
  "4113": { codigo: "4113", nombre: "Remuneraciones en especie por pagar", nivel: 4, padre: "411" },
  "4114": { codigo: "4114", nombre: "Gratificaciones por pagar", nivel: 4, padre: "411" },
  "4115": { codigo: "4115", nombre: "Vacaciones por pagar", nivel: 4, padre: "411" },
  "413": { codigo: "413", nombre: "Participaciones de los trabajadores por pagar", nivel: 3, padre: "41" },
  "415": { codigo: "415", nombre: "Beneficios sociales de los trabajadores por pagar", nivel: 3, padre: "41" },
  "4151": { codigo: "4151", nombre: "Compensación por tiempo de servicios", nivel: 4, padre: "415" },
  "4152": { codigo: "4152", nombre: "Adelanto de compensación por tiempo de servicios", nivel: 4, padre: "415" },
  "4153": { codigo: "4153", nombre: "Pensiones y jubilaciones", nivel: 4, padre: "415" },
  
  "42": { codigo: "42", nombre: "CUENTAS POR PAGAR COMERCIALES – TERCEROS", nivel: 2 },
  "421": { codigo: "421", nombre: "Facturas, boletas y otros comprobantes por pagar", nivel: 3, padre: "42" },
  "4212": { codigo: "4212", nombre: "Emitidas", nivel: 4, padre: "421" },
  "4213": { codigo: "4213", nombre: "Aceptadas", nivel: 4, padre: "421" },
  "422": { codigo: "422", nombre: "Anticipos a proveedores", nivel: 3, padre: "42" },
  "423": { codigo: "423", nombre: "Letras por pagar", nivel: 3, padre: "42" },
  
  "46": { codigo: "46", nombre: "CUENTAS POR PAGAR DIVERSAS – TERCEROS", nivel: 2 },
  "461": { codigo: "461", nombre: "Reclamaciones de terceros", nivel: 3, padre: "46" },
  "462": { codigo: "462", nombre: "Pasivos por instrumentos financieros", nivel: 3, padre: "46" },
  "463": { codigo: "463", nombre: "Pasivos por compra de activo inmovilizado", nivel: 3, padre: "46" },
  "465": { codigo: "465", nombre: "Pasivos por moneda extranjera", nivel: 3, padre: "46" },
  "467": { codigo: "467", nombre: "Depósitos recibidos en garantía", nivel: 3, padre: "46" },
  "469": { codigo: "469", nombre: "Otras cuentas por pagar diversas", nivel: 3, padre: "46" },
  
  // ELEMENTO 5: PATRIMONIO
  "50": { codigo: "50", nombre: "CAPITAL", nivel: 2 },
  "501": { codigo: "501", nombre: "Capital social", nivel: 3, padre: "50" },
  "5011": { codigo: "5011", nombre: "Acciones", nivel: 4, padre: "501" },
  "5012": { codigo: "5012", nombre: "Participaciones", nivel: 4, padre: "501" },
  "502": { codigo: "502", nombre: "Capital personal", nivel: 3, padre: "50" },
  
  "56": { codigo: "56", nombre: "RESULTADOS NO REALIZADOS", nivel: 2 },
  "561": { codigo: "561", nombre: "Diferencia en cambio de inversiones permanentes en entidades extranjeras", nivel: 3, padre: "56" },
  "562": { codigo: "562", nombre: "Instrumentos financieros - Cobertura de flujo de efectivo", nivel: 3, padre: "56" },
  "563": { codigo: "563", nombre: "Ganancia o pérdida en activos o pasivos financieros disponibles para la venta", nivel: 3, padre: "56" },
  
  "57": { codigo: "57", nombre: "EXCEDENTE DE REVALUACIÓN", nivel: 2 },
  "571": { codigo: "571", nombre: "Excedente de revaluación", nivel: 3, padre: "57" },
  "5711": { codigo: "5711", nombre: "Inversiones inmobiliarias", nivel: 4, padre: "571" },
  "5712": { codigo: "5712", nombre: "Inmuebles, maquinaria y equipo", nivel: 4, padre: "571" },
  "5713": { codigo: "5713", nombre: "Intangibles", nivel: 4, padre: "571" },
  
  "58": { codigo: "58", nombre: "RESERVAS", nivel: 2 },
  "581": { codigo: "581", nombre: "Reinversión", nivel: 3, padre: "58" },
  "582": { codigo: "582", nombre: "Legal", nivel: 3, padre: "58" },
  "583": { codigo: "583", nombre: "Contractuales", nivel: 3, padre: "58" },
  "584": { codigo: "584", nombre: "Estatutarias", nivel: 3, padre: "58" },
  "585": { codigo: "585", nombre: "Facultativas", nivel: 3, padre: "58" },
  "589": { codigo: "589", nombre: "Otras reservas", nivel: 3, padre: "58" },
  
  "59": { codigo: "59", nombre: "RESULTADOS ACUMULADOS", nivel: 2 },
  "591": { codigo: "591", nombre: "Utilidades no distribuidas", nivel: 3, padre: "59" },
  "5911": { codigo: "5911", nombre: "Utilidades acumuladas", nivel: 4, padre: "591" },
  "5912": { codigo: "5912", nombre: "Ingresos de ejercicios anteriores", nivel: 4, padre: "591" },
  "592": { codigo: "592", nombre: "Pérdidas acumuladas", nivel: 3, padre: "59" },
  "5921": { codigo: "5921", nombre: "Pérdidas acumuladas", nivel: 4, padre: "592" },
  "5922": { codigo: "5922", nombre: "Gastos de ejercicios anteriores", nivel: 4, padre: "592" },
  
  // ELEMENTO 6: GASTOS POR NATURALEZA
  "60": { codigo: "60", nombre: "COMPRAS", nivel: 2 },
  "601": { codigo: "601", nombre: "Mercaderías", nivel: 3, padre: "60" },
  "6011": { codigo: "6011", nombre: "Mercaderías manufacturadas", nivel: 4, padre: "601" },
  "6018": { codigo: "6018", nombre: "Otras mercaderías", nivel: 4, padre: "601" },
  "602": { codigo: "602", nombre: "Materias primas", nivel: 3, padre: "60" },
  "6021": { codigo: "6021", nombre: "Materias primas para productos manufacturados", nivel: 4, padre: "602" },
  "603": { codigo: "603", nombre: "Materiales auxiliares, suministros y repuestos", nivel: 3, padre: "60" },
  "6031": { codigo: "6031", nombre: "Materiales auxiliares", nivel: 4, padre: "603" },
  "6032": { codigo: "6032", nombre: "Suministros", nivel: 4, padre: "603" },
  "6033": { codigo: "6033", nombre: "Repuestos", nivel: 4, padre: "603" },
  "609": { codigo: "609", nombre: "Costos vinculados con las compras", nivel: 3, padre: "60" },
  "6091": { codigo: "6091", nombre: "Costos vinculados con las compras de mercaderías", nivel: 4, padre: "609" },
  "6092": { codigo: "6092", nombre: "Costos vinculados con las compras de materias primas", nivel: 4, padre: "609" },
  "6093": { codigo: "6093", nombre: "Costos vinculados con las compras de materiales auxiliares, suministros y repuestos", nivel: 4, padre: "609" },
  
  "61": { codigo: "61", nombre: "VARIACIÓN DE EXISTENCIAS", nivel: 2 },
  "611": { codigo: "611", nombre: "Mercaderías", nivel: 3, padre: "61" },
  "6111": { codigo: "6111", nombre: "Mercaderías manufacturadas", nivel: 4, padre: "611" },
  "612": { codigo: "612", nombre: "Materias primas", nivel: 3, padre: "61" },
  "6121": { codigo: "6121", nombre: "Materias primas para productos manufacturados", nivel: 4, padre: "612" },
  "613": { codigo: "613", nombre: "Materiales auxiliares, suministros y repuestos", nivel: 3, padre: "61" },
  "6131": { codigo: "6131", nombre: "Materiales auxiliares", nivel: 4, padre: "613" },
  "6132": { codigo: "6132", nombre: "Suministros", nivel: 4, padre: "613" },
  "6133": { codigo: "6133", nombre: "Repuestos", nivel: 4, padre: "613" },
  
  "62": { codigo: "62", nombre: "GASTOS DE PERSONAL, DIRECTORES Y GERENTES", nivel: 2 },
  "621": { codigo: "621", nombre: "Remuneraciones", nivel: 3, padre: "62" },
  "6211": { codigo: "6211", nombre: "Sueldos y salarios", nivel: 4, padre: "621" },
  "6212": { codigo: "6212", nombre: "Comisiones", nivel: 4, padre: "621" },
  "6213": { codigo: "6213", nombre: "Remuneraciones en especie", nivel: 4, padre: "621" },
  "6214": { codigo: "6214", nombre: "Gratificaciones", nivel: 4, padre: "621" },
  "6215": { codigo: "6215", nombre: "Vacaciones", nivel: 4, padre: "621" },
  "627": { codigo: "627", nombre: "Seguridad, previsión social y otras contribuciones", nivel: 3, padre: "62" },
  "6271": { codigo: "6271", nombre: "Régimen de prestaciones de salud", nivel: 4, padre: "627" },
  "6272": { codigo: "6272", nombre: "Régimen de pensiones", nivel: 4, padre: "627" },
  "6273": { codigo: "6273", nombre: "Seguro complementario de trabajo de riesgo, accidentes de trabajo y enfermedades profesionales", nivel: 4, padre: "627" },
  "6274": { codigo: "6274", nombre: "Seguro de vida", nivel: 4, padre: "627" },
  "6275": { codigo: "6275", nombre: "Seguros particulares de prestaciones de salud", nivel: 4, padre: "627" },
  "629": { codigo: "629", nombre: "Beneficios sociales de los trabajadores", nivel: 3, padre: "62" },
  "6291": { codigo: "6291", nombre: "Compensación por tiempo de servicios", nivel: 4, padre: "629" },
  "6292": { codigo: "6292", nombre: "Pensiones y jubilaciones", nivel: 4, padre: "629" },
  "6293": { codigo: "6293", nombre: "Otros beneficios post empleo", nivel: 4, padre: "629" },
  
  "63": { codigo: "63", nombre: "GASTOS DE SERVICIOS PRESTADOS POR TERCEROS", nivel: 2 },
  "631": { codigo: "631", nombre: "Transporte, correos y gastos de viaje", nivel: 3, padre: "63" },
  "6311": { codigo: "6311", nombre: "Transporte", nivel: 4, padre: "631" },
  "6312": { codigo: "6312", nombre: "Correos", nivel: 4, padre: "631" },
  "6313": { codigo: "6313", nombre: "Alojamiento", nivel: 4, padre: "631" },
  "6314": { codigo: "6314", nombre: "Alimentación", nivel: 4, padre: "631" },
  "6315": { codigo: "6315", nombre: "Otros gastos de viaje", nivel: 4, padre: "631" },
  "632": { codigo: "632", nombre: "Asesoría y consultoría", nivel: 3, padre: "63" },
  "6321": { codigo: "6321", nombre: "Administrativa", nivel: 4, padre: "632" },
  "6322": { codigo: "6322", nombre: "Legal y tributaria", nivel: 4, padre: "632" },
  "6323": { codigo: "6323", nombre: "Auditoría y contable", nivel: 4, padre: "632" },
  "6324": { codigo: "6324", nombre: "Mercadotecnia", nivel: 4, padre: "632" },
  "6325": { codigo: "6325", nombre: "Medioambiental", nivel: 4, padre: "632" },
  "6326": { codigo: "6326", nombre: "Investigación y desarrollo", nivel: 4, padre: "632" },
  "6327": { codigo: "6327", nombre: "Producción", nivel: 4, padre: "632" },
  "6328": { codigo: "6328", nombre: "Otros", nivel: 4, padre: "632" },
  "633": { codigo: "633", nombre: "Producción encargada a terceros", nivel: 3, padre: "63" },
  "634": { codigo: "634", nombre: "Mantenimiento y reparaciones", nivel: 3, padre: "63" },
  "6341": { codigo: "6341", nombre: "Inmuebles, maquinaria y equipo", nivel: 4, padre: "634" },
  "6342": { codigo: "6342", nombre: "Intangibles", nivel: 4, padre: "634" },
  "635": { codigo: "635", nombre: "Alquileres", nivel: 3, padre: "63" },
  "6351": { codigo: "6351", nombre: "Terrenos", nivel: 4, padre: "635" },
  "6352": { codigo: "6352", nombre: "Edificaciones", nivel: 4, padre: "635" },
  "6353": { codigo: "6353", nombre: "Maquinarias y equipos de explotación", nivel: 4, padre: "635" },
  "6354": { codigo: "6354", nombre: "Equipo de transporte", nivel: 4, padre: "635" },
  "6356": { codigo: "6356", nombre: "Equipos diversos", nivel: 4, padre: "635" },
  "636": { codigo: "636", nombre: "Servicios básicos", nivel: 3, padre: "63" },
  "6361": { codigo: "6361", nombre: "Energía eléctrica", nivel: 4, padre: "636" },
  "6362": { codigo: "6362", nombre: "Gas", nivel: 4, padre: "636" },
  "6363": { codigo: "6363", nombre: "Agua", nivel: 4, padre: "636" },
  "6364": { codigo: "6364", nombre: "Teléfono", nivel: 4, padre: "636" },
  "6365": { codigo: "6365", nombre: "Internet", nivel: 4, padre: "636" },
  "6366": { codigo: "6366", nombre: "Radio y televisión", nivel: 4, padre: "636" },
  "637": { codigo: "637", nombre: "Publicidad, publicaciones, relaciones públicas", nivel: 3, padre: "63" },
  "6371": { codigo: "6371", nombre: "Publicidad", nivel: 4, padre: "637" },
  "6372": { codigo: "6372", nombre: "Publicaciones", nivel: 4, padre: "637" },
  "6373": { codigo: "6373", nombre: "Relaciones públicas", nivel: 4, padre: "637" },
  "638": { codigo: "638", nombre: "Servicios de contratistas", nivel: 3, padre: "63" },
  "639": { codigo: "639", nombre: "Otros servicios prestados por terceros", nivel: 3, padre: "63" },
  "6391": { codigo: "6391", nombre: "Gastos bancarios", nivel: 4, padre: "639" },
  "6392": { codigo: "6392", nombre: "Gastos de laboratorio", nivel: 4, padre: "639" },
  
  "64": { codigo: "64", nombre: "GASTOS POR TRIBUTOS", nivel: 2 },
  "641": { codigo: "641", nombre: "Gobierno central", nivel: 3, padre: "64" },
  "6411": { codigo: "6411", nombre: "Impuesto general a las ventas", nivel: 4, padre: "641" },
  "6412": { codigo: "6412", nombre: "Impuesto selectivo al consumo", nivel: 4, padre: "641" },
  "6413": { codigo: "6413", nombre: "Impuesto a las transacciones financieras", nivel: 4, padre: "641" },
  "6414": { codigo: "6414", nombre: "Impuesto temporal a los activos netos", nivel: 4, padre: "641" },
  "6417": { codigo: "6417", nombre: "Impuesto a la renta", nivel: 4, padre: "641" },
  "6418": { codigo: "6418", nombre: "Otros impuestos", nivel: 4, padre: "641" },
  "642": { codigo: "642", nombre: "Gobierno regional", nivel: 3, padre: "64" },
  "643": { codigo: "643", nombre: "Gobierno local", nivel: 3, padre: "64" },
  "6431": { codigo: "6431", nombre: "Impuesto predial", nivel: 4, padre: "643" },
  "6432": { codigo: "6432", nombre: "Arbitrios municipales y seguridad ciudadana", nivel: 4, padre: "643" },
  "6433": { codigo: "6433", nombre: "Impuesto al patrimonio vehicular", nivel: 4, padre: "643" },
  "6434": { codigo: "6434", nombre: "Impuesto de alcabala", nivel: 4, padre: "643" },
  "6439": { codigo: "6439", nombre: "Otros", nivel: 4, padre: "643" },
  "644": { codigo: "644", nombre: "Otros gastos por tributos", nivel: 3, padre: "64" },
  
  "65": { codigo: "65", nombre: "OTROS GASTOS DE GESTIÓN", nivel: 2 },
  "651": { codigo: "651", nombre: "Seguros", nivel: 3, padre: "65" },
  "6511": { codigo: "6511", nombre: "Seguros generales", nivel: 4, padre: "651" },
  "6512": { codigo: "6512", nombre: "Seguros de vida", nivel: 4, padre: "651" },
  "6513": { codigo: "6513", nombre: "Seguros de accidentes personales", nivel: 4, padre: "651" },
  "652": { codigo: "652", nombre: "Regalías", nivel: 3, padre: "65" },
  "653": { codigo: "653", nombre: "Suscripciones", nivel: 3, padre: "65" },
  "654": { codigo: "654", nombre: "Licencias y derechos de vigencia", nivel: 3, padre: "65" },
  "655": { codigo: "655", nombre: "Costo neto de enajenación de activos inmovilizados y operaciones discontinuadas", nivel: 3, padre: "65" },
  "6551": { codigo: "6551", nombre: "Costo neto de enajenación de activos inmovilizados", nivel: 4, padre: "655" },
  "6552": { codigo: "6552", nombre: "Operaciones discontinuadas - abandono de activos", nivel: 4, padre: "655" },
  "656": { codigo: "656", nombre: "Suministros", nivel: 3, padre: "65" },
  "6561": { codigo: "6561", nombre: "Suministros (combustibles y lubricantes)", nivel: 4, padre: "656" },
  "6562": { codigo: "6562", nombre: "Suministros (otros)", nivel: 4, padre: "656" },
  "657": { codigo: "657", nombre: "Gastos de investigación y desarrollo", nivel: 3, padre: "65" },
  "658": { codigo: "658", nombre: "Gestión medioambiental", nivel: 3, padre: "65" },
  "659": { codigo: "659", nombre: "Otros gastos de gestión", nivel: 3, padre: "65" },
  "6591": { codigo: "6591", nombre: "Donaciones", nivel: 4, padre: "659" },
  "6592": { codigo: "6592", nombre: "Sanciones administrativas", nivel: 4, padre: "659" },
  
  "66": { codigo: "66", nombre: "PÉRDIDA POR MEDICIÓN DE ACTIVOS NO FINANCIEROS AL VALOR RAZONABLE", nivel: 2 },
  "661": { codigo: "661", nombre: "Activo realizable", nivel: 3, padre: "66" },
  "6611": { codigo: "6611", nombre: "Mercaderías", nivel: 4, padre: "661" },
  "6612": { codigo: "6612", nombre: "Productos terminados", nivel: 4, padre: "661" },
  "662": { codigo: "662", nombre: "Activo inmovilizado", nivel: 3, padre: "66" },
  "6621": { codigo: "6621", nombre: "Inversiones inmobiliarias", nivel: 4, padre: "662" },
  "6622": { codigo: "6622", nombre: "Activos biológicos", nivel: 4, padre: "662" },
  
  "67": { codigo: "67", nombre: "GASTOS FINANCIEROS", nivel: 2 },
  "671": { codigo: "671", nombre: "Gastos en operaciones de endeudamiento y otros", nivel: 3, padre: "67" },
  "6711": { codigo: "6711", nombre: "Préstamos de instituciones financieras y otras entidades", nivel: 4, padre: "671" },
  "6712": { codigo: "6712", nombre: "Contratos de arrendamiento financiero", nivel: 4, padre: "671" },
  "672": { codigo: "672", nombre: "Pérdida por instrumentos financieros derivados", nivel: 3, padre: "67" },
  "673": { codigo: "673", nombre: "Intereses por préstamos y otras obligaciones", nivel: 3, padre: "67" },
  "6731": { codigo: "6731", nombre: "Préstamos de instituciones financieras y otras entidades", nivel: 4, padre: "673" },
  "6732": { codigo: "6732", nombre: "Contratos de arrendamiento financiero", nivel: 4, padre: "673" },
  "6733": { codigo: "6733", nombre: "Otros instrumentos financieros por pagar", nivel: 4, padre: "673" },
  "675": { codigo: "675", nombre: "Descuentos concedidos por pronto pago", nivel: 3, padre: "67" },
  "676": { codigo: "676", nombre: "Diferencia de cambio", nivel: 3, padre: "67" },
  "677": { codigo: "677", nombre: "Pérdida por medición de activos y pasivos financieros al valor razonable", nivel: 3, padre: "67" },
  "678": { codigo: "678", nombre: "Participación en los resultados de subsidiarias y asociadas bajo el método del valor patrimonial", nivel: 3, padre: "67" },
  "679": { codigo: "679", nombre: "Otros gastos financieros", nivel: 3, padre: "67" },
  "6791": { codigo: "6791", nombre: "Gastos financieros en medición a valor descontado", nivel: 4, padre: "679" },
  "6792": { codigo: "6792", nombre: "Otros", nivel: 4, padre: "679" },
  
  "68": { codigo: "68", nombre: "VALUACIÓN Y DETERIORO DE ACTIVOS Y PROVISIONES", nivel: 2 },
  "681": { codigo: "681", nombre: "Depreciación", nivel: 3, padre: "68" },
  "6811": { codigo: "6811", nombre: "Depreciación de inversiones inmobiliarias", nivel: 4, padre: "681" },
  "6812": { codigo: "6812", nombre: "Depreciación de activos adquiridos en arrendamiento financiero", nivel: 4, padre: "681" },
  "6813": { codigo: "6813", nombre: "Depreciación de inmuebles, maquinaria y equipo - Costo", nivel: 4, padre: "681" },
  "6814": { codigo: "6814", nombre: "Depreciación de inmuebles, maquinaria y equipo - Revaluación", nivel: 4, padre: "681" },
  "6815": { codigo: "6815", nombre: "Depreciación de activos biológicos en producción - Costo", nivel: 4, padre: "681" },
  "6816": { codigo: "6816", nombre: "Depreciación de activos biológicos en producción - Revaluación", nivel: 4, padre: "681" },
  "682": { codigo: "682", nombre: "Amortización de intangibles", nivel: 3, padre: "68" },
  "6821": { codigo: "6821", nombre: "Amortización de intangibles - Costo", nivel: 4, padre: "682" },
  "6822": { codigo: "6822", nombre: "Amortización de intangibles - Revaluación", nivel: 4, padre: "682" },
  
  // ELEMENTO 7: INGRESOS
  "70": { codigo: "70", nombre: "VENTAS", nivel: 2 },
  "701": { codigo: "701", nombre: "Mercaderías", nivel: 3, padre: "70" },
  "7011": { codigo: "7011", nombre: "Mercaderías manufacturadas", nivel: 4, padre: "701" },
  "7018": { codigo: "7018", nombre: "Otras mercaderías", nivel: 4, padre: "701" },
  "702": { codigo: "702", nombre: "Productos terminados", nivel: 3, padre: "70" },
  "7021": { codigo: "7021", nombre: "Productos manufacturados", nivel: 4, padre: "702" },
  "7022": { codigo: "7022", nombre: "Productos de extracción terminados", nivel: 4, padre: "702" },
  "7023": { codigo: "7023", nombre: "Productos agropecuarios y piscícolas terminados", nivel: 4, padre: "702" },
  "7024": { codigo: "7024", nombre: "Productos inmuebles", nivel: 4, padre: "702" },
  "704": { codigo: "704", nombre: "Prestación de servicios", nivel: 3, padre: "70" },
  "7041": { codigo: "7041", nombre: "Terceros", nivel: 4, padre: "704" },
  "7042": { codigo: "7042", nombre: "Relacionadas", nivel: 4, padre: "704" },
  "708": { codigo: "708", nombre: "Otros ingresos operacionales", nivel: 3, padre: "70" },
  "709": { codigo: "709", nombre: "Devoluciones sobre ventas", nivel: 3, padre: "70" },
  "7091": { codigo: "7091", nombre: "Devoluciones sobre ventas - Terceros", nivel: 4, padre: "709" },
  "7092": { codigo: "7092", nombre: "Devoluciones sobre ventas - Relacionadas", nivel: 4, padre: "709" },
  
  "71": { codigo: "71", nombre: "VARIACIÓN DE LA PRODUCCIÓN ALMACENADA", nivel: 2 },
  "711": { codigo: "711", nombre: "Variación de productos terminados", nivel: 3, padre: "71" },
  "7111": { codigo: "7111", nombre: "Productos manufacturados", nivel: 4, padre: "711" },
  "7112": { codigo: "7112", nombre: "Productos de extracción terminados", nivel: 4, padre: "711" },
  "7113": { codigo: "7113", nombre: "Productos agropecuarios y piscícolas terminados", nivel: 4, padre: "711" },
  "7114": { codigo: "7114", nombre: "Productos inmuebles", nivel: 4, padre: "711" },
  "712": { codigo: "712", nombre: "Variación de subproductos, desechos y desperdicios", nivel: 3, padre: "71" },
  "7121": { codigo: "7121", nombre: "Subproductos", nivel: 4, padre: "712" },
  "7122": { codigo: "7122", nombre: "Desechos y desperdicios", nivel: 4, padre: "712" },
  "713": { codigo: "713", nombre: "Variación de productos en proceso", nivel: 3, padre: "71" },
  "7131": { codigo: "7131", nombre: "Productos en proceso de manufactura", nivel: 4, padre: "713" },
  "7132": { codigo: "7132", nombre: "Productos extraídos en proceso de transformación", nivel: 4, padre: "713" },
  "7133": { codigo: "7133", nombre: "Productos agropecuarios y piscícolas en proceso", nivel: 4, padre: "713" },
  "7134": { codigo: "7134", nombre: "Productos inmuebles en proceso", nivel: 4, padre: "713" },
  "714": { codigo: "714", nombre: "Variación de envases y embalajes", nivel: 3, padre: "71" },
  "715": { codigo: "715", nombre: "Variación de existencias de servicios", nivel: 3, padre: "71" },
  "7151": { codigo: "7151", nombre: "Existencias de servicios en proceso", nivel: 4, padre: "715" },
  
  "72": { codigo: "72", nombre: "PRODUCCIÓN DE ACTIVO INMOVILIZADO", nivel: 2 },
  "721": { codigo: "721", nombre: "Inversiones inmobiliarias", nivel: 3, padre: "72" },
  "7211": { codigo: "7211", nombre: "Edificaciones", nivel: 4, padre: "721" },
  "722": { codigo: "722", nombre: "Inmuebles, maquinaria y equipo", nivel: 3, padre: "72" },
  "7221": { codigo: "7221", nombre: "Edificaciones", nivel: 4, padre: "722" },
  "7222": { codigo: "7222", nombre: "Maquinarias y equipos de explotación", nivel: 4, padre: "722" },
  "7223": { codigo: "7223", nombre: "Equipo de transporte", nivel: 4, padre: "722" },
  "7224": { codigo: "7224", nombre: "Muebles y enseres", nivel: 4, padre: "722" },
  "7225": { codigo: "7225", nombre: "Equipos diversos", nivel: 4, padre: "722" },
  "723": { codigo: "723", nombre: "Intangibles", nivel: 3, padre: "72" },
  "7231": { codigo: "7231", nombre: "Programas de computadora (software)", nivel: 4, padre: "723" },
  "7232": { codigo: "7232", nombre: "Costos de exploración y desarrollo", nivel: 4, padre: "723" },
  "7233": { codigo: "7233", nombre: "Fórmulas, diseños y prototipos", nivel: 4, padre: "723" },
  "724": { codigo: "724", nombre: "Activos biológicos", nivel: 3, padre: "72" },
  "7241": { codigo: "7241", nombre: "Activos biológicos en desarrollo", nivel: 4, padre: "724" },
  "7242": { codigo: "7242", nombre: "Activos biológicos en producción", nivel: 4, padre: "724" },
  
  "73": { codigo: "73", nombre: "DESCUENTOS, REBAJAS Y BONIFICACIONES OBTENIDOS", nivel: 2 },
  "731": { codigo: "731", nombre: "Descuentos, rebajas y bonificaciones obtenidos", nivel: 3, padre: "73" },
  "7311": { codigo: "7311", nombre: "Terceros", nivel: 4, padre: "731" },
  "7312": { codigo: "7312", nombre: "Relacionadas", nivel: 4, padre: "731" },
  
  "74": { codigo: "74", nombre: "DESCUENTOS, REBAJAS Y BONIFICACIONES CONCEDIDOS", nivel: 2 },
  "741": { codigo: "741", nombre: "Descuentos, rebajas y bonificaciones concedidos", nivel: 3, padre: "74" },
  "7411": { codigo: "7411", nombre: "Terceros", nivel: 4, padre: "741" },
  "7412": { codigo: "7412", nombre: "Relacionadas", nivel: 4, padre: "741" },
  
  "75": { codigo: "75", nombre: "OTROS INGRESOS DE GESTIÓN", nivel: 2 },
  "751": { codigo: "751", nombre: "Servicios en beneficio del personal", nivel: 3, padre: "75" },
  "7511": { codigo: "7511", nombre: "Transporte", nivel: 4, padre: "751" },
  "7512": { codigo: "7512", nombre: "Vivienda", nivel: 4, padre: "751" },
  "7513": { codigo: "7513", nombre: "Alimentación", nivel: 4, padre: "751" },
  "7514": { codigo: "7514", nombre: "Salud", nivel: 4, padre: "751" },
  "7515": { codigo: "7515", nombre: "Educación - personal", nivel: 4, padre: "751" },
  "7516": { codigo: "7516", nombre: "Educación - hijos del personal", nivel: 4, padre: "751" },
  "7517": { codigo: "7517", nombre: "Recreación", nivel: 4, padre: "751" },
  "7518": { codigo: "7518", nombre: "Otros servicios en beneficio del personal", nivel: 4, padre: "751" },
  "752": { codigo: "752", nombre: "Comisiones y corretajes", nivel: 3, padre: "75" },
  "7521": { codigo: "7521", nombre: "Comisiones", nivel: 4, padre: "752" },
  "7522": { codigo: "7522", nombre: "Corretajes", nivel: 4, padre: "752" },
  "753": { codigo: "753", nombre: "Regalías", nivel: 3, padre: "75" },
  "754": { codigo: "754", nombre: "Alquileres", nivel: 3, padre: "75" },
  "7541": { codigo: "7541", nombre: "Terrenos", nivel: 4, padre: "754" },
  "7542": { codigo: "7542", nombre: "Edificaciones", nivel: 4, padre: "754" },
  "7543": { codigo: "7543", nombre: "Maquinarias y equipos de explotación", nivel: 4, padre: "754" },
  "7544": { codigo: "7544", nombre: "Equipo de transporte", nivel: 4, padre: "754" },
  "7545": { codigo: "7545", nombre: "Equipos diversos", nivel: 4, padre: "754" },
  "755": { codigo: "755", nombre: "Recuperación de cuentas de valuación", nivel: 3, padre: "75" },
  "7551": { codigo: "7551", nombre: "Recuperación - Cuentas de cobranza dudosa", nivel: 4, padre: "755" },
  "7552": { codigo: "7552", nombre: "Recuperación - Desvalorización de existencias", nivel: 4, padre: "755" },
  "756": { codigo: "756", nombre: "Enajenación de activos inmovilizados", nivel: 3, padre: "75" },
  "7561": { codigo: "7561", nombre: "Inversiones inmobiliarias", nivel: 4, padre: "756" },
  "7562": { codigo: "7562", nombre: "Inmuebles, maquinaria y equipo", nivel: 4, padre: "756" },
  "7563": { codigo: "7563", nombre: "Intangibles", nivel: 4, padre: "756" },
  "7564": { codigo: "7564", nombre: "Activos biológicos", nivel: 4, padre: "756" },
  "757": { codigo: "757", nombre: "Recuperación de deterioro de cuentas de activos inmovilizados", nivel: 3, padre: "75" },
  "7571": { codigo: "7571", nombre: "Recuperación de deterioro de inversiones inmobiliarias", nivel: 4, padre: "757" },
  "7572": { codigo: "7572", nombre: "Recuperación de deterioro de inmuebles, maquinaria y equipo", nivel: 4, padre: "757" },
  "7573": { codigo: "7573", nombre: "Recuperación de deterioro de intangibles", nivel: 4, padre: "757" },
  "758": { codigo: "758", nombre: "Otros ingresos de gestión", nivel: 3, padre: "75" },
  "7581": { codigo: "7581", nombre: "Recuperación de impuestos", nivel: 4, padre: "758" },
  "7582": { codigo: "7582", nombre: "Subvenciones gubernamentales", nivel: 4, padre: "758" },
  "759": { codigo: "759", nombre: "Otros ingresos de gestión", nivel: 3, padre: "75" },
  "7591": { codigo: "7591", nombre: "Subsidios recibidos", nivel: 4, padre: "759" },
  "7592": { codigo: "7592", nombre: "Otros", nivel: 4, padre: "759" },
  
  "76": { codigo: "76", nombre: "GANANCIA POR MEDICIÓN DE ACTIVOS NO FINANCIEROS AL VALOR RAZONABLE", nivel: 2 },
  "761": { codigo: "761", nombre: "Activo realizable", nivel: 3, padre: "76" },
  "7611": { codigo: "7611", nombre: "Mercaderías", nivel: 4, padre: "761" },
  "7612": { codigo: "7612", nombre: "Productos terminados", nivel: 4, padre: "761" },
  "762": { codigo: "762", nombre: "Activo inmovilizado", nivel: 3, padre: "76" },
  "7621": { codigo: "7621", nombre: "Inversiones inmobiliarias", nivel: 4, padre: "762" },
  "7622": { codigo: "7622", nombre: "Activos biológicos", nivel: 4, padre: "762" },
  
  "77": { codigo: "77", nombre: "INGRESOS FINANCIEROS", nivel: 2 },
  "771": { codigo: "771", nombre: "Ganancia por instrumento financiero derivado", nivel: 3, padre: "77" },
  "772": { codigo: "772", nombre: "Rendimientos ganados", nivel: 3, padre: "77" },
  "7721": { codigo: "7721", nombre: "Depósitos en instituciones financieras", nivel: 4, padre: "772" },
  "7722": { codigo: "7722", nombre: "Inversiones a ser mantenidas hasta el vencimiento", nivel: 4, padre: "772" },
  "7723": { codigo: "7723", nombre: "Inversiones disponibles para la venta", nivel: 4, padre: "772" },
  "773": { codigo: "773", nombre: "Dividendos", nivel: 3, padre: "77" },
  "774": { codigo: "774", nombre: "Ingresos en operaciones de factoraje", nivel: 3, padre: "77" },
  "775": { codigo: "775", nombre: "Descuentos obtenidos por pronto pago", nivel: 3, padre: "77" },
  "776": { codigo: "776", nombre: "Diferencia de cambio", nivel: 3, padre: "77" },
  "777": { codigo: "777", nombre: "Ganancia por medición de activos y pasivos financieros al valor razonable", nivel: 3, padre: "77" },
  "7771": { codigo: "7771", nombre: "Inversiones mantenidas para negociación", nivel: 4, padre: "777" },
  "7772": { codigo: "7772", nombre: "Inversiones disponibles para la venta", nivel: 4, padre: "777" },
  "778": { codigo: "778", nombre: "Participación en los resultados de subsidiarias y asociadas bajo el método del valor patrimonial", nivel: 3, padre: "77" },
  "7781": { codigo: "7781", nombre: "Subsidiarias", nivel: 4, padre: "778" },
  "7782": { codigo: "7782", nombre: "Asociadas", nivel: 4, padre: "778" },
  "779": { codigo: "779", nombre: "Otros ingresos financieros", nivel: 3, padre: "77" },
  "7791": { codigo: "7791", nombre: "Ingresos financieros en medición a valor descontado", nivel: 4, padre: "779" },
  "7792": { codigo: "7792", nombre: "Otros", nivel: 4, padre: "779" },
  
  // ELEMENTO 8: SALDOS INTERMEDIARIOS DE GESTIÓN Y DETERMINACIÓN DEL RESULTADO DEL EJERCICIO
  "80": { codigo: "80", nombre: "MARGEN COMERCIAL", nivel: 2 },
  "801": { codigo: "801", nombre: "Margen comercial", nivel: 3, padre: "80" },
  "8011": { codigo: "8011", nombre: "Mercaderías - Terceros", nivel: 4, padre: "801" },
  "8012": { codigo: "8012", nombre: "Mercaderías - Relacionadas", nivel: 4, padre: "801" },
  
  "81": { codigo: "81", nombre: "PRODUCCIÓN DEL EJERCICIO", nivel: 2 },
  "811": { codigo: "811", nombre: "Producción de bienes", nivel: 3, padre: "81" },
  "812": { codigo: "812", nombre: "Producción de servicios", nivel: 3, padre: "81" },
  "813": { codigo: "813", nombre: "Producción de activo inmovilizado", nivel: 3, padre: "81" },
  
  "82": { codigo: "82", nombre: "VALOR AGREGADO", nivel: 2 },
  "821": { codigo: "821", nombre: "Valor agregado", nivel: 3, padre: "82" },
  
  "83": { codigo: "83", nombre: "EXCEDENTE BRUTO (INSUFICIENCIA BRUTA) DE EXPLOTACIÓN", nivel: 2 },
  "831": { codigo: "831", nombre: "Excedente bruto (insuficiencia bruta) de explotación", nivel: 3, padre: "83" },
  
  "84": { codigo: "84", nombre: "RESULTADO DE EXPLOTACIÓN", nivel: 2 },
  "841": { codigo: "841", nombre: "Resultado de explotación", nivel: 3, padre: "84" },
  
  "85": { codigo: "85", nombre: "RESULTADO ANTES DE PARTICIPACIONES E IMPUESTOS", nivel: 2 },
  "851": { codigo: "851", nombre: "Resultado antes de participaciones e impuestos", nivel: 3, padre: "85" },
  
  "87": { codigo: "87", nombre: "PARTICIPACIONES DE LOS TRABAJADORES", nivel: 2 },
  "871": { codigo: "871", nombre: "Participación de los trabajadores - corriente", nivel: 3, padre: "87" },
  "872": { codigo: "872", nombre: "Participación de los trabajadores - diferida", nivel: 3, padre: "87" },
  
  "88": { codigo: "88", nombre: "IMPUESTO A LA RENTA", nivel: 2 },
  "881": { codigo: "881", nombre: "Impuesto a la renta - corriente", nivel: 3, padre: "88" },
  "882": { codigo: "882", nombre: "Impuesto a la renta - diferido", nivel: 3, padre: "88" },
  
  "89": { codigo: "89", nombre: "DETERMINACIÓN DEL RESULTADO DEL EJERCICIO", nivel: 2 },
  "891": { codigo: "891", nombre: "Utilidad", nivel: 3, padre: "89" },
  "892": { codigo: "892", nombre: "Pérdida", nivel: 3, padre: "89" },
  
  // ELEMENTO 9: CONTABILIDAD ANALÍTICA DE EXPLOTACIÓN
  "90": { codigo: "90", nombre: "COSTOS DE PRODUCCIÓN", nivel: 2 },
  "901": { codigo: "901", nombre: "Materia prima", nivel: 3, padre: "90" },
  "902": { codigo: "902", nombre: "Mano de obra directa", nivel: 3, padre: "90" },
  "903": { codigo: "903", nombre: "Costos indirectos", nivel: 3, padre: "90" },
  
  "91": { codigo: "91", nombre: "COSTOS POR DISTRIBUIR", nivel: 2 },
  "911": { codigo: "911", nombre: "Costos por distribuir", nivel: 3, padre: "91" },
  
  "92": { codigo: "92", nombre: "COSTOS DE PRODUCCIÓN", nivel: 2 },
  "921": { codigo: "921", nombre: "Costos de productos terminados", nivel: 3, padre: "92" },
  "922": { codigo: "922", nombre: "Costos de subproductos, desechos y desperdicios", nivel: 3, padre: "92" },
  
  "93": { codigo: "93", nombre: "CENTROS DE COSTOS", nivel: 2 },
  "931": { codigo: "931", nombre: "Centro de costo de producción", nivel: 3, padre: "93" },
  "932": { codigo: "932", nombre: "Centro de costo de administración", nivel: 3, padre: "93" },
  "933": { codigo: "933", nombre: "Centro de costo de distribución", nivel: 3, padre: "93" },
  
  // ELEMENTO 0: CUENTAS DE ORDEN
  "01": { codigo: "01", nombre: "BIENES Y VALORES ENTREGADOS", nivel: 2 },
  "011": { codigo: "011", nombre: "Mercaderías", nivel: 3, padre: "01" },
  "012": { codigo: "012", nombre: "Inmuebles, maquinaria y equipo", nivel: 3, padre: "01" },
  "013": { codigo: "013", nombre: "Intangibles", nivel: 3, padre: "01" },
  "014": { codigo: "014", nombre: "Títulos y valores", nivel: 3, padre: "01" },
  
  "02": { codigo: "02", nombre: "BIENES Y VALORES RECIBIDOS", nivel: 2 },
  "021": { codigo: "021", nombre: "Mercaderías", nivel: 3, padre: "02" },
  "022": { codigo: "022", nombre: "Inmuebles, maquinaria y equipo", nivel: 3, padre: "02" },
  "023": { codigo: "023", nombre: "Intangibles", nivel: 3, padre: "02" },
  "024": { codigo: "024", nombre: "Títulos y valores", nivel: 3, padre: "02" },
  
  "03": { codigo: "03", nombre: "GARANTÍAS OTORGADAS", nivel: 2 },
  "031": { codigo: "031", nombre: "Garantías otorgadas", nivel: 3, padre: "03" },
  
  "04": { codigo: "04", nombre: "GARANTÍAS RECIBIDAS", nivel: 2 },
  "041": { codigo: "041", nombre: "Garantías recibidas", nivel: 3, padre: "04" },
  
  "05": { codigo: "05", nombre: "CUENTAS DE ORDEN DEUDORAS", nivel: 2 },
  "051": { codigo: "051", nombre: "Cuentas de orden deudoras", nivel: 3, padre: "05" },
  
  "06": { codigo: "06", nombre: "CUENTAS DE ORDEN ACREEDORAS", nivel: 2 },
  "061": { codigo: "061", nombre: "Cuentas de orden acreedoras", nivel: 3, padre: "06" },
  
  "07": { codigo: "07", nombre: "VENTAS", nivel: 2 },
  "071": { codigo: "071", nombre: "Ventas", nivel: 3, padre: "07" },
  
  "08": { codigo: "08", nombre: "COSTOS DE VENTAS", nivel: 2 },
  "081": { codigo: "081", nombre: "Costos de ventas", nivel: 3, padre: "08" },
  
  "09": { codigo: "09", nombre: "GASTOS DE FUNCIÓN", nivel: 2 },
  "091": { codigo: "091", nombre: "Gastos de ventas", nivel: 3, padre: "09" },
  "092": { codigo: "092", nombre: "Gastos de administración", nivel: 3, padre: "09" }
};

// ========================================
// 2. CONFIGURACIÓN DE PLANILLA Y RRHH
// ========================================

const CONFIGURACION_PLANILLA = {
  // Parámetros legales actualizados 2024
  UIT: 5150,
  RMV: 1025,
  ASIGNACION_FAMILIAR: 102.50,
  
  // Tasas de aportes
  TASAS: {
    AFP: {
      PRIMA: 0.0125,      // 1.25% Prima de seguros
      COMISION_FLUJO: 0.0069,  // Variable según AFP
      COMISION_MIXTA: 0.018    // Variable según AFP
    },
    ONP: 0.13,              // 13%
    ESSALUD: 0.09,          // 9% - empleador
    SCTR: 0.0053,           // Variable según riesgo
    SENATI: 0.0075          // 0.75% - empleador
  },
  
  // Tablas de quinta categoría
  QUINTA_CATEGORIA: [
    { desde: 0, hasta: 5 * 5150, tasa: 0, deduccion: 0 },
    { desde: 5 * 5150, hasta: 20 * 5150, tasa: 0.08, deduccion: 0.08 * 5 * 5150 },
    { desde: 20 * 5150, hasta: 35 * 5150, tasa: 0.14, deduccion: 0.14 * 20 * 5150 - 0.06 * 5 * 5150 },
    { desde: 35 * 5150, hasta: 45 * 5150, tasa: 0.17, deduccion: 0.17 * 35 * 5150 - 0.03 * 15 * 5150 },
    { desde: 45 * 5150, hasta: Infinity, tasa: 0.30, deduccion: 0.30 * 45 * 5150 - 0.13 * 10 * 5150 }
  ]
};

// ========================================
// 3. SISTEMA DE ROLES Y PERMISOS
// ========================================

const ROLES_PERMISOS = {
  administrador: {
    contabilidad: ['crear', 'leer', 'actualizar', 'eliminar', 'reportes'],
    rrhh: ['crear', 'leer', 'actualizar', 'eliminar', 'planilla'],
    facturas: ['crear', 'leer', 'actualizar', 'eliminar'],
    configuracion: ['leer', 'actualizar'],
    usuarios: ['crear', 'leer', 'actualizar', 'eliminar']
  },
  contador: {
    contabilidad: ['crear', 'leer', 'actualizar', 'reportes'],
    facturas: ['crear', 'leer', 'actualizar'],
    rrhh: ['leer'],
    configuracion: ['leer']
  },
  rrhh: {
    rrhh: ['crear', 'leer', 'actualizar', 'planilla'],
    facturas: ['leer'],
    contabilidad: ['leer'],
    configuracion: ['leer']
  },
  usuario: {
    facturas: ['crear', 'leer'],
    rrhh: ['leer'],
    contabilidad: ['leer']
  }
};

// ========================================
// 4. CLASES PRINCIPALES
// ========================================

// Clase Asiento Contable
class AsientoContable {
  constructor() {
    this.numero = '';
    this.fecha = '';
    this.glosa = '';
    this.detalles = [];
    this.totalDebe = 0;
    this.totalHaber = 0;
    this.estado = 'borrador'; // borrador, registrado, anulado
  }

  agregarDetalle(cuenta, debe, haber, glosaDetalle = '') {
    if (!PLAN_CONTABLE[cuenta]) {
      throw new Error(`Cuenta ${cuenta} no existe en el plan contable`);
    }
    
    this.detalles.push({
      cuenta: cuenta,
      nombreCuenta: PLAN_CONTABLE[cuenta].nombre,
      debe: parseFloat(debe) || 0,
      haber: parseFloat(haber) || 0,
      glosa: glosaDetalle || this.glosa
    });
    
    this.calcularTotales();
  }

  calcularTotales() {
    this.totalDebe = this.detalles.reduce((sum, det) => sum + det.debe, 0);
    this.totalHaber = this.detalles.reduce((sum, det) => sum + det.haber, 0);
  }

  validar() {
    if (Math.abs(this.totalDebe - this.totalHaber) > 0.01) {
      throw new Error('El asiento no está balanceado. Debe = Haber');
    }
    
    if (this.detalles.length < 2) {
      throw new Error('Un asiento debe tener al menos 2 cuentas');
    }
    
    return true;
  }
}

// Clase Empleado Completo
class EmpleadoCompleto {
  constructor(datos) {
    // Datos personales
    this.dni = datos.dni;
    this.nombres = datos.nombres || datos.firstName;
    this.apellidos = datos.apellidos || datos.lastName;
    this.fechaNacimiento = datos.fechaNacimiento;
    this.sexo = datos.sexo;
    this.estadoCivil = datos.estadoCivil;
    this.direccion = datos.direccion;
    this.telefono = datos.telefono;
    this.email = datos.email;
    
    // Datos laborales
    this.fechaIngreso = datos.fechaIngreso;
    this.cargo = datos.cargo;
    this.area = datos.area;
    this.tipoContrato = datos.tipoContrato; // indefinido, temporal, part-time
    this.regimen = datos.regimen; // privado, publico, cas
    this.sueldoBasico = datos.sueldoBasico || CONFIGURACION_PLANILLA.RMV;
    this.tipoTrabajador = datos.tipoTrabajador; // empleado, obrero
    
    // Sistema de pensiones
    this.sistemaPension = datos.sistemaPension || 'AFP'; // AFP, ONP, SIN_SISTEMA
    this.afp = datos.afp; // PRIMA, INTEGRA, PROFUTURO, HABITAT
    this.cuspp = datos.cuspp;
    this.fechaAfiliacion = datos.fechaAfiliacion;
    
    // Estado
    this.estado = datos.estado || datos.status || 'activo';
    this.fechaBaja = datos.fechaBaja;
    this.motivoBaja = datos.motivoBaja;
  }
}

// Configuración del Sistema
class ConfiguracionSistema {
  constructor() {
    this.empresa = {
      ruc: '',
      razonSocial: '',
      nombreComercial: '',
      direccion: '',
      ubigeo: '',
      telefono: '',
      email: '',
      actividadEconomica: '',
      tipoEmpresa: '', // micro, pequeña, mediana, grande
      regimen: '' // general, especial, mype
    };
    
    this.parametros = {
      monedaFuncional: 'PEN',
      ejercicioFiscal: new Date().getFullYear(),
      tipoCambio: 3.75,
      igvRate: 0.18,
      retencionRate: 0.03,
      percepcionRate: 0.02
    };
    
    this.integraciones = {
      sunat: {
        habilitado: false,
        usuario: '',
        clave: '',
        ambiente: 'beta' // beta, produccion
      },
      plame: {
        habilitado: false,
        codigo: ''
      },
      ple: {
        habilitado: true,
        version: '1.0'
      }
    };
  }
}

// ========================================
// 5. CALCULADORAS Y GENERADORES
// ========================================

// Calculadora de Planilla
class CalculadoraPlanilla {
  static calcularRemuneracion(empleado, periodo, conceptosAdicionales = {}) {
    const resultado = {
      empleado: empleado,
      periodo: periodo,
      ingresos: {},
      descuentos: {},
      aportes: {},
      neto: 0
    };
    
    // Ingresos
    resultado.ingresos.sueldoBasico = empleado.sueldoBasico;
    resultado.ingresos.asignacionFamiliar = this.calcularAsignacionFamiliar(empleado);
    resultado.ingresos.horasExtras = conceptosAdicionales.horasExtras || 0;
    resultado.ingresos.bonificaciones = conceptosAdicionales.bonificaciones || 0;
    
    const totalIngresos = Object.values(resultado.ingresos).reduce((sum, val) => sum + val, 0);
    
    // Descuentos
    if (empleado.sistemaPension === 'AFP') {
      resultado.descuentos.afpAporte = totalIngresos * CONFIGURACION_PLANILLA.TASAS.AFP.PRIMA;
      resultado.descuentos.afpComision = totalIngresos * CONFIGURACION_PLANILLA.TASAS.AFP.COMISION_FLUJO;
      resultado.descuentos.afpSeguro = totalIngresos * 0.0125; // Variable según AFP
    } else if (empleado.sistemaPension === 'ONP') {
      resultado.descuentos.onp = totalIngresos * CONFIGURACION_PLANILLA.TASAS.ONP;
    }
    
    // Quinta categoría
    resultado.descuentos.quintaCategoria = this.calcularQuintaCategoria(totalIngresos, periodo);
    
    // Préstamos y otros descuentos
    resultado.descuentos.prestamos = conceptosAdicionales.prestamos || 0;
    resultado.descuentos.otros = conceptosAdicionales.otrosDescuentos || 0;
    
    // Aportes del empleador
    resultado.aportes.essalud = totalIngresos * CONFIGURACION_PLANILLA.TASAS.ESSALUD;
    resultado.aportes.sctr = totalIngresos * CONFIGURACION_PLANILLA.TASAS.SCTR;
    resultado.aportes.senati = totalIngresos * CONFIGURACION_PLANILLA.TASAS.SENATI;
    
    // Cálculo neto
    const totalDescuentos = Object.values(resultado.descuentos).reduce((sum, val) => sum + val, 0);
    resultado.neto = totalIngresos - totalDescuentos;
    
    return resultado;
  }
  
  static calcularAsignacionFamiliar(empleado) {
    // Lógica para determinar si tiene derecho a asignación familiar
    // Simplificado: asumimos que tiene hijos
    return CONFIGURACION_PLANILLA.ASIGNACION_FAMILIAR;
  }
  
  static calcularQuintaCategoria(ingresoAnual, periodo) {
    // Proyección anual basada en el ingreso mensual
    const ingresoAnualProyectado = ingresoAnual * 12;
    const deduccion = 7 * CONFIGURACION_PLANILLA.UIT; // 7 UIT
    const baseImponible = Math.max(0, ingresoAnualProyectado - deduccion);
    
    let impuesto = 0;
    for (const tramo of CONFIGURACION_PLANILLA.QUINTA_CATEGORIA) {
      if (baseImponible > tramo.desde) {
        const baseTramo = Math.min(baseImponible, tramo.hasta) - tramo.desde;
        impuesto += baseTramo * tramo.tasa;
      }
    }
    
    // Retorno mensual
    return impuesto / 12;
  }
}

// Generador de Reportes Contables
class ReportesContables {
  static generarBalanceComprobacion(fechaInicio, fechaFin) {
    // Simulación - en producción consultar BD
    const movimientos = obtenerMovimientosContables(fechaInicio, fechaFin);
    const balance = {};
    
    Object.keys(PLAN_CONTABLE).forEach(cuenta => {
      balance[cuenta] = {
        codigo: cuenta,
        nombre: PLAN_CONTABLE[cuenta].nombre,
        saldoAnterior: 0,
        debe: 0,
        haber: 0,
        saldoActual: 0
      };
    });
    
    // Procesar movimientos
    movimientos.forEach(mov => {
      if (balance[mov.cuenta]) {
        balance[mov.cuenta].debe += mov.debe;
        balance[mov.cuenta].haber += mov.haber;
        balance[mov.cuenta].saldoActual = 
          balance[mov.cuenta].saldoAnterior + mov.debe - mov.haber;
      }
    });
    
    return balance;
  }

  static generarEstadoResultados(fechaInicio, fechaFin) {
    const balance = this.generarBalanceComprobacion(fechaInicio, fechaFin);
    
    const resultado = {
      ingresos: {
        ventas: 0,
        otrosIngresos: 0,
        total: 0
      },
      gastos: {
        costoVentas: 0,
        gastosOperativos: 0,
        gastosFinancieros: 0,
        total: 0
      },
      utilidadBruta: 0,
      utilidadOperativa: 0,
      utilidadNeta: 0
    };
    
    // Clasificar cuentas por naturaleza
    Object.values(balance).forEach(cuenta => {
      const codigo = cuenta.codigo.substring(0, 2);
      
      if (codigo >= '70' && codigo <= '79') {
        // Ingresos
        if (codigo === '70') resultado.ingresos.ventas += cuenta.saldoActual;
        else resultado.ingresos.otrosIngresos += cuenta.saldoActual;
      }
      
      if (codigo >= '60' && codigo <= '69') {
        // Gastos
        if (codigo === '69') resultado.gastos.costoVentas += Math.abs(cuenta.saldoActual);
        else resultado.gastos.gastosOperativos += Math.abs(cuenta.saldoActual);
      }
    });
    
    resultado.ingresos.total = resultado.ingresos.ventas + resultado.ingresos.otrosIngresos;
    resultado.gastos.total = resultado.gastos.costoVentas + resultado.gastos.gastosOperativos;
    resultado.utilidadBruta = resultado.ingresos.ventas - resultado.gastos.costoVentas;
    resultado.utilidadOperativa = resultado.utilidadBruta - resultado.gastos.gastosOperativos;
    resultado.utilidadNeta = resultado.utilidadOperativa - resultado.gastos.gastosFinancieros;
    
    return resultado;
  }
}

// Generador de Boletas de Pago
class GeneradorBoletas {
  static generar(calculoPlanilla) {
    const boleta = {
      empresa: {
        ruc: "20123456789",
        razonSocial: "TECSITEL S.A.C.",
        direccion: "AV. EJEMPLO 123, LIMA"
      },
      empleado: calculoPlanilla.empleado,
      periodo: calculoPlanilla.periodo,
      ingresos: calculoPlanilla.ingresos,
      descuentos: calculoPlanilla.descuentos,
      neto: calculoPlanilla.neto,
      fecha: new Date().toLocaleDateString()
    };
    
    return this.formatearBoleta(boleta);
  }
  
  static formatearBoleta(boleta) {
    return `
    ================================
    BOLETA DE PAGO
    ================================
    ${boleta.empresa.razonSocial}
    RUC: ${boleta.empresa.ruc}
    ${boleta.empresa.direccion}
    
    Trabajador: ${boleta.empleado.nombres} ${boleta.empleado.apellidos}
    DNI: ${boleta.empleado.dni}
    Cargo: ${boleta.empleado.cargo || 'No especificado'}
    Período: ${boleta.periodo}
    
    INGRESOS:
    ${Object.entries(boleta.ingresos).map(([key, value]) => 
      `${key.toUpperCase()}: S/ ${value.toFixed(2)}`).join('\n    ')}
    
    DESCUENTOS:
    ${Object.entries(boleta.descuentos).map(([key, value]) => 
      `${key.toUpperCase()}: S/ ${value.toFixed(2)}`).join('\n    ')}
    
    NETO A PAGAR: S/ ${boleta.neto.toFixed(2)}
    
    Fecha: ${boleta.fecha}
    ================================
    `;
  }
}

// ========================================
// 6. EXPORTADORES ESPECIALIZADOS
// ========================================

// Exportador PLE (Programa de Libros Electrónicos)
class ExportadorPLE {
  static generarLibroDiario(fechaInicio, fechaFin) {
    const movimientos = obtenerMovimientosContables(fechaInicio, fechaFin);
    const empresaRuc = '20123456789';
    const periodo = fechaInicio.getFullYear() + fechaInicio.getMonth().toString().padStart(2, '0');
    
    let contenido = '';
    
    movimientos.forEach((mov, index) => {
      const linea = [
        periodo,                    // Período
        empresaRuc,                // RUC
        'TECSITEL S.A.C.',        // Razón Social
        '030100',                  // Código del libro
        (index + 1).toString().padStart(10, '0'), // Número correlativo
        mov.fecha.replace(/-/g, ''), // Fecha
        mov.numero,                // Número del asiento
        'M001',                    // Código cuenta contable
        mov.cuenta,                // Cuenta contable
        '',                        // Código unidad de operación
        '',                        // Centro de costos
        '',                        // Tipo de moneda de origen
        '',                        // Tipo de documento
        '',                        // Número de documento
        mov.fecha.replace(/-/g, ''), // Fecha de documento
        mov.fecha.replace(/-/g, ''), // Fecha de vencimiento
        '',                        // Número de RUC
        '',                        // Apellidos y nombres
        mov.glosa,                 // Glosa o descripción
        mov.debe.toFixed(2),       // Movimientos del Debe
        mov.haber.toFixed(2),      // Movimientos del Haber
        '',                        // Dato estructurado
        '1'                        // Estado de la operación
      ].join('|');
      
      contenido += linea + '\n';
    });
    
    return contenido;
  }
  
  static generarRegistroVentas(fechaInicio, fechaFin) {
    const facturas = obtenerFacturas(fechaInicio, fechaFin);
    const empresaRuc = '20123456789';
    const periodo = fechaInicio.getFullYear() + fechaInicio.getMonth().toString().padStart(2, '0');
    
    let contenido = '';
    
    facturas.forEach((factura, index) => {
      const baseImponible = factura.isExport ? factura.amount : factura.amount / 1.18;
      const igv = factura.isExport ? 0 : factura.amount - baseImponible;
      
      const linea = [
        periodo,                    // Período
        empresaRuc,                // RUC
        'TECSITEL S.A.C.',        // Razón Social
        '140100',                  // Código del libro
        (index + 1).toString().padStart(10, '0'), // Número correlativo
        factura.date.replace(/-/g, ''), // Fecha de emisión
        factura.date.replace(/-/g, ''), // Fecha de vencimiento
        '01',                      // Tipo de comprobante (Factura)
        factura.invoice_number.split('-')[0], // Serie
        factura.invoice_number.split('-')[1], // Número
        '',                        // Número final
        '6',                       // Tipo de documento del cliente
        factura.clientRuc,         // Número de documento del cliente
        factura.clientName,        // Apellidos y nombres del cliente
        baseImponible.toFixed(2),  // Valor facturado de exportación
        baseImponible.toFixed(2),  // Base imponible operación gravada
        '',                        // Descuento base imponible
        igv.toFixed(2),           // Impuesto general a las ventas
        '',                        // Descuento IGV
        '',                        // Monto operación no gravada
        '',                        // Monto operación exonerada
        '',                        // Monto operación inafecta
        '',                        // Impuesto selectivo al consumo
        '',                        // Base imponible IVAP
        '',                        // Impuesto al valor agregado portuario
        '',                        // Otros tributos
        factura.amount.toFixed(2), // Importe total
        factura.currency,          // Código de la moneda
        '1.000',                   // Tipo de cambio
        factura.date.replace(/-/g, ''), // Fecha emisión documento modificado
        '',                        // Tipo comprobante modificado
        '',                        // Serie comprobante modificado
        '',                        // Código dependencia aduanera
        '1'                        // Estado de la operación
      ].join('|');
      
      contenido += linea + '\n';
    });
    
    return contenido;
  }
}

// Exportador PLAME (Planilla Mensual de Pagos)
class ExportadorPLAME {
  static generar(empleados, periodo) {
    const archivos = {
      rem: this.generarREM(empleados, periodo),      // Remuneraciones
      per: this.generarPER(empleados),               // Personal
      est: this.generarEST(empleados, periodo),      // Establecimiento
      ide: this.generarIDE()                         // Identificación
    };
    
    return archivos;
  }
  
  static generarREM(empleados, periodo) {
    let contenido = '';
    
    empleados.forEach(empleado => {
      const empleadoCompleto = new EmpleadoCompleto(empleado);
      const calculo = CalculadoraPlanilla.calcularRemuneracion(empleadoCompleto, periodo);
      
      const linea = [
        empleado.dni,                           // Tipo y número de documento
        empleado.tipoTrabajador || '05',       // Categoría del trabajador
        '0000000001',                          // Número orden del trabajador
        empleado.sistemaPension === 'ONP' ? '02' : '01', // Régimen pensionario
        empleado.cuspp || '',                  // CUSPP
        periodo.replace('-', ''),              // Período
        '01',                                  // Tipo de renta
        calculo.ingresos.sueldoBasico.toFixed(2), // Remuneración
        (calculo.descuentos.afpAporte || 0).toFixed(2),  // Aporte trabajador
        calculo.aportes.essalud.toFixed(2),    // Aporte empleador
        '1'                                    // Indicador
      ].join('|');
      
      contenido += linea + '\n';
    });
    
    return contenido;
  }
  
  static generarPER(empleados) {
    let contenido = '';
    
    empleados.forEach(empleado => {
      const linea = [
        '1',                                   // Tipo de documento
        empleado.dni,                         // Número de documento
        (empleado.apellidos || empleado.lastName).split(' ')[0] || '',     // Apellido paterno
        (empleado.apellidos || empleado.lastName).split(' ')[1] || '', // Apellido materno
        empleado.nombres || empleado.firstName,                     // Nombres
        empleado.fechaNacimiento || '19900101', // Fecha nacimiento
        empleado.sexo || 'M',                 // Sexo
        '0000',                               // Nacionalidad
        '',                                   // Teléfono
        '',                                   // Correo
        empleado.direccion || '',             // Dirección
        '1'                                   // Estado
      ].join('|');
      
      contenido += linea + '\n';
    });
    
    return contenido;
  }
  
  static generarEST(empleados, periodo) {
    return `20123456789|TECSITEL S.A.C.|${empleados.length}|${periodo.replace('-', '')}|1`;
  }
  
  static generarIDE() {
    return `20123456789|TECSITEL S.A.C.|AV. EJEMPLO 123|LIMA|LIMA|LIMA|1`;
  }
}

// ========================================
// 7. SISTEMA DE AUDITORÍA
// ========================================

class SistemaAuditoria {
  static registrar(usuario, accion, modulo, detalle = {}) {
    const evento = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      usuario: usuario,
      accion: accion, // CREATE, READ, UPDATE, DELETE
      modulo: modulo, // CONTABILIDAD, RRHH, FACTURAS, SISTEMA
      detalle: detalle,
      ip: this.obtenerIP(),
      userAgent: navigator.userAgent
    };
    
    // Guardar en localStorage (en producción usar BD)
    const logs = JSON.parse(localStorage.getItem('auditoria') || '[]');
    logs.push(evento);
    
    // Mantener solo últimos 1000 registros
    if (logs.length > 1000) {
      logs.shift();
    }
    
    localStorage.setItem('auditoria', JSON.stringify(logs));
  }
  
  static obtenerLogs(filtros = {}) {
    const logs = JSON.parse(localStorage.getItem('auditoria') || '[]');
    
    return logs.filter(log => {
      if (filtros.usuario && log.usuario !== filtros.usuario) return false;
      if (filtros.modulo && log.modulo !== filtros.modulo) return false;
      if (filtros.fechaInicio && new Date(log.timestamp) < new Date(filtros.fechaInicio)) return false;
      if (filtros.fechaFin && new Date(log.timestamp) > new Date(filtros.fechaFin)) return false;
      return true;
    });
  }
  
  static obtenerIP() {
    // En producción, usar servicio para obtener IP real
    return '192.168.1.100';
  }
}

// ========================================
// 8. VALIDADORES
// ========================================

const Validadores = {
  ruc: (ruc) => {
    if (!/^\d{11}$/.test(ruc)) return false;
    // Algoritmo módulo 11 para validar RUC
    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, weight, i) => acc + weight * parseInt(ruc[i]), 0);
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;
    return checkDigit === parseInt(ruc[10]);
  },
  
  dni: (dni) => {
    return /^\d{8}$/.test(dni);
  },
  
  cuspp: (cuspp) => {
    return /^\d{12}$/.test(cuspp);
  },
  
  email: (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
};

// ========================================
// 9. FUNCIONES DE UTILIDAD
// ========================================

// Simuladores de datos (reemplazar con llamadas reales a BD)
function obtenerFacturas(fechaInicio, fechaFin) {
  // Simulación - obtener de AppState o BD
  return AppState?.invoices?.filter(inv => {
    const facturaDate = new Date(inv.date);
    return facturaDate >= fechaInicio && facturaDate <= fechaFin;
  }) || [];
}

// ========================================
// 10. FUNCIONES DE INTEGRACIÓN CON EL SISTEMA PRINCIPAL
// ========================================

// Cargar el plan contable en los selects
function loadAccountingPlan() {
    const accountSelects = document.querySelectorAll('.account-select');
    
    accountSelects.forEach(select => {
        // Limpiar opciones existentes
        select.innerHTML = '<option value="">Seleccionar cuenta...</option>';
        
        // Agregar cuentas del plan contable
        Object.entries(PLAN_CONTABLE).forEach(([codigo, cuenta]) => {
            if (cuenta.nivel <= 4) { // Solo mostrar hasta nivel 4 para simplificar
                const option = document.createElement('option');
                option.value = codigo;
                option.textContent = `${codigo} - ${cuenta.nombre}`;
                select.appendChild(option);
            }
        });
    });
}

// Funciones de Contabilidad Avanzada
function generateBalanceSheet() {
    if (typeof showToast !== 'function') {
        console.log('📊 Generando Balance de Comprobación...');
        return;
    }
    
    showToast('📊 Generando Balance de Comprobación...', 'info');
    
    const fechaInicio = new Date('2024-01-01');
    const fechaFin = new Date();
    
    try {
        const balance = ReportesContables.generarBalanceComprobacion(fechaInicio, fechaFin);
        
        // Crear y descargar CSV
        const csvContent = generateBalanceCSV(balance);
        downloadCSV(csvContent, 'balance_comprobacion.csv');
        
        showToast('✅ Balance de Comprobación generado', 'success');
    } catch (error) {
        showToast('❌ Error al generar balance: ' + error.message, 'error');
    }
}

function generateIncomeStatement() {
    if (typeof showToast !== 'function') {
        console.log('📈 Generando Estado de Resultados...');
        return;
    }
    
    showToast('📈 Generando Estado de Resultados...', 'info');
    
    const fechaInicio = new Date('2024-01-01');
    const fechaFin = new Date();
    
    try {
        const estado = ReportesContables.generarEstadoResultados(fechaInicio, fechaFin);
        
        // Crear contenido del reporte
        const reporteContent = `
ESTADO DE RESULTADOS
====================
Período: ${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()}

INGRESOS:
Ventas: S/ ${estado.ingresos.ventas.toFixed(2)}
Otros Ingresos: S/ ${estado.ingresos.otrosIngresos.toFixed(2)}
Total Ingresos: S/ ${estado.ingresos.total.toFixed(2)}

GASTOS:
Costo de Ventas: S/ ${estado.gastos.costoVentas.toFixed(2)}
Gastos Operativos: S/ ${estado.gastos.gastosOperativos.toFixed(2)}
Gastos Financieros: S/ ${estado.gastos.gastosFinancieros.toFixed(2)}
Total Gastos: S/ ${estado.gastos.total.toFixed(2)}

RESULTADOS:
Utilidad Bruta: S/ ${estado.utilidadBruta.toFixed(2)}
Utilidad Operativa: S/ ${estado.utilidadOperativa.toFixed(2)}
Utilidad Neta: S/ ${estado.utilidadNeta.toFixed(2)}
        `;
        
        downloadTXT(reporteContent, 'estado_resultados.txt');
        showToast('✅ Estado de Resultados generado', 'success');
    } catch (error) {
        showToast('❌ Error al generar estado: ' + error.message, 'error');
    }
}

function exportPLE() {
    if (typeof showToast !== 'function') {
        console.log('📤 Exportando PLE para SUNAT...');
        return;
    }
    
    showToast('📤 Exportando PLE para SUNAT...', 'info');
    
    const fechaInicio = new Date('2024-01-01');
    const fechaFin = new Date();
    
    try {
        // Generar archivos PLE
        const libroDiario = ExportadorPLE.generarLibroDiario(fechaInicio, fechaFin);
        const registroVentas = ExportadorPLE.generarRegistroVentas(fechaInicio, fechaFin);
        
        // Descargar archivos
        downloadTXT(libroDiario, 'LE20123456789202401030100001111.txt');
        downloadTXT(registroVentas, 'LE20123456789202401140100001111.txt');
        
        // Registrar en auditoría
        SistemaAuditoria.registrar(currentUser?.name || 'admin', 'EXPORT', 'PLE', {
            tipo: 'Libros Electrónicos',
            periodo: '2024-01'
        });
        
        showToast('✅ Archivos PLE exportados correctamente', 'success');
    } catch (error) {
        showToast('❌ Error al exportar PLE: ' + error.message, 'error');
    }
}

// Funciones de Planilla
function generatePayslips() {
    if (typeof showToast !== 'function') {
        console.log('📄 Generando boletas de pago...');
        return;
    }
    
    showToast('📄 Generando boletas de pago...', 'info');
    
    try {
        const empleados = AppState?.employees?.filter(emp => emp.status === 'Activo') || [];
        const periodo = new Date().toISOString().substring(0, 7); // YYYY-MM
        
        if (empleados.length === 0) {
            showToast('⚠️ No hay empleados activos para generar boletas', 'warning');
            return;
        }
        
        empleados.forEach(empleado => {
            const empleadoCompleto = new EmpleadoCompleto({
                ...empleado,
                sueldoBasico: empleado.sueldoBasico || 1025,
                sistemaPension: empleado.sistemaPension || 'AFP'
            });
            
            const calculo = CalculadoraPlanilla.calcularRemuneracion(empleadoCompleto, periodo);
            const boleta = GeneradorBoletas.generar(calculo);
            
            // Descargar boleta individual
            downloadTXT(boleta, `boleta_${empleado.dni}_${periodo}.txt`);
        });
        
        showToast('✅ Boletas generadas correctamente', 'success');
    } catch (error) {
        showToast('❌ Error al generar boletas: ' + error.message, 'error');
    }
}

function exportPLAME() {
    if (typeof showToast !== 'function') {
        console.log('📊 Exportando PLAME...');
        return;
    }
    
    showToast('📊 Exportando PLAME...', 'info');
    
    try {
        const empleados = AppState?.employees?.filter(emp => emp.status === 'Activo') || [];
        const periodo = new Date().toISOString().substring(0, 7);
        
        if (empleados.length === 0) {
            showToast('⚠️ No hay empleados activos para exportar PLAME', 'warning');
            return;
        }
        
        const archivos = ExportadorPLAME.generar(empleados, periodo);
        
        // Descargar cada archivo
        Object.entries(archivos).forEach(([tipo, contenido]) => {
            downloadTXT(contenido, `0621${periodo.replace('-', '')}${tipo.toUpperCase()}.txt`);
        });
        
        showToast('✅ Archivos PLAME exportados', 'success');
    } catch (error) {
        showToast('❌ Error al exportar PLAME: ' + error.message, 'error');
    }
}

function exportTRegister() {
    if (typeof showToast !== 'function') {
        console.log('📋 Exportando T-Registro...');
        return;
    }
    
    showToast('📋 Exportando T-Registro...', 'info');
    
    try {
        const empleados = AppState?.employees || [];
        
        // Generar archivo T-Registro básico
        let contenido = 'REGISTRO DE TRABAJADORES\n';
        contenido += '========================\n\n';
        contenido += 'DNI,NOMBRES,APELLIDOS,FECHA_INGRESO,CARGO,ESTADO\n';
        
        empleados.forEach(empleado => {
            contenido += `${empleado.dni},"${empleado.firstName || empleado.nombres}","${empleado.lastName || empleado.apellidos}","${empleado.fechaIngreso || '01/01/2024}","${empleado.cargo || 'Empleado}","${empleado.status || empleado.estado}"\n`;
        });
        
        downloadTXT(contenido, `t_registro_${new Date().toISOString().split('T')[0]}.txt`);
        showToast('✅ T-Registro exportado correctamente', 'success');
    } catch (error) {
        showToast('❌ Error al exportar T-Registro: ' + error.message, 'error');
    }
}

// Funciones de Administración
function showAuditLogs() {
    const logs = SistemaAuditoria.obtenerLogs();
    
    if (typeof showToast !== 'function') {
        console.log('Logs de auditoría:', logs);
        return;
    }
    
    if (logs.length === 0) {
        showToast('📋 No hay registros de auditoría', 'info');
        return;
    }
    
    // Generar reporte de auditoría
    let reporte = 'REGISTRO DE AUDITORÍA\n';
    reporte += '====================\n\n';
    
    logs.slice(-50).forEach(log => {
        reporte += `${log.timestamp} | ${log.usuario} | ${log.accion} | ${log.modulo}\n`;
        if (log.detalle && Object.keys(log.detalle).length > 0) {
            reporte += `  Detalle: ${JSON.stringify(log.detalle)}\n`;
        }
        reporte += '\n';
    });
    
    downloadTXT(reporte, `auditoria_${new Date().toISOString().split('T')[0]}.txt`);
    showToast(`📋 ${logs.length} registros de auditoría exportados`, 'info');
}

function exportAuditReport() {
    showAuditLogs();
}

function scheduleBackup() {
    if (typeof showToast !== 'function') {
        console.log('⏰ Configurando respaldo automático...');
        return;
    }
    
    showToast('⏰ Configurando respaldo automático...', 'info');
    
    // Programar respaldo diario a las 23:00
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(23, 0, 0, 0);
    
    if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    const timeUntilBackup = scheduledTime.getTime() - now.getTime();
    
    setTimeout(() => {
        downloadAdvancedBackup();
        showToast('🔄 Respaldo automático ejecutado', 'success');
        
        // Reprogramar para el siguiente día
        scheduleBackup();
    }, timeUntilBackup);
    
    showToast('✅ Respaldo programado para las 23:00', 'success');
}

function downloadAdvancedBackup() {
    if (typeof showToast !== 'function') {
        console.log('💾 Generando respaldo avanzado...');
        return;
    }
    
    showToast('💾 Generando respaldo avanzado...', 'info');
    
    const backupCompleto = {
        version: '3.0.1',
        timestamp: new Date().toISOString(),
        empresa: AppState?.configuracion?.empresa || {},
        datos: {
            facturas: AppState?.invoices || [],
            empleados: AppState?.employees || [],
            asistencia: AppState?.timeEntries || [],
            contabilidad: AppState?.contabilidad || {},
            configuracion: AppState?.configuracion || {}
        },
        auditoria: SistemaAuditoria.obtenerLogs()
    };
    
    const blob = new Blob([JSON.stringify(backupCompleto, null, 2)], { 
        type: 'application/json' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `tecsitel_backup_completo_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    // Registrar en auditoría
    SistemaAuditoria.registrar(currentUser?.name || 'admin', 'BACKUP', 'SISTEMA', {
        tipo: 'Respaldo Completo',
        registros: Object.keys(backupCompleto.datos).reduce((total, key) => 
            total + (Array.isArray(backupCompleto.datos[key]) ? backupCompleto.datos[key].length : 1), 0)
    });
    
    showToast('✅ Respaldo avanzado descargado', 'success');
}

function showUserRoles() {
    if (typeof showToast !== 'function') {
        console.log('👥 Mostrando roles de usuario...');
        return;
    }
    
    let reporte = 'ROLES Y PERMISOS DEL SISTEMA\n';
    reporte += '============================\n\n';
    
    Object.entries(ROLES_PERMISOS).forEach(([rol, permisos]) => {
        reporte += `ROL: ${rol.toUpperCase()}\n`;
        reporte += '-'.repeat(rol.length + 5) + '\n';
        
        Object.entries(permisos).forEach(([modulo, acciones]) => {
            reporte += `  ${modulo}: ${acciones.join(', ')}\n`;
        });
        reporte += '\n';
    });
    
    downloadTXT(reporte, 'roles_permisos.txt');
    showToast('👥 Reporte de roles y permisos generado', 'success');
}

function showTaxConfig() {
    if (typeof showToast !== 'function') {
        console.log('💰 Mostrando configuración fiscal...');
        return;
    }
    
    let config = 'CONFIGURACIÓN FISCAL\n';
    config += '===================\n\n';
    config += `UIT 2024: S/ ${CONFIGURACION_PLANILLA.UIT.toLocaleString()}\n`;
    config += `RMV 2024: S/ ${CONFIGURACION_PLANILLA.RMV.toLocaleString()}\n`;
    config += `Asignación Familiar: S/ ${CONFIGURACION_PLANILLA.ASIGNACION_FAMILIAR.toFixed(2)}\n\n`;
    
    config += 'TASAS DE APORTES:\n';
    config += `- EsSalud: ${(CONFIGURACION_PLANILLA.TASAS.ESSALUD * 100).toFixed(2)}%\n`;
    config += `- ONP: ${(CONFIGURACION_PLANILLA.TASAS.ONP * 100).toFixed(2)}%\n`;
    config += `- AFP Prima Seguros: ${(CONFIGURACION_PLANILLA.TASAS.AFP.PRIMA * 100).toFixed(2)}%\n`;
    config += `- AFP Comisión: ${(CONFIGURACION_PLANILLA.TASAS.AFP.COMISION_FLUJO * 100).toFixed(2)}%\n`;
    config += `- SENATI: ${(CONFIGURACION_PLANILLA.TASAS.SENATI * 100).toFixed(2)}%\n`;
    
    downloadTXT(config, 'configuracion_fiscal.txt');
    showToast('💰 Configuración fiscal exportada', 'success');
}

// Funciones auxiliares
function generateBalanceCSV(balance) {
    const headers = ['Código', 'Cuenta', 'Saldo Anterior', 'Debe', 'Haber', 'Saldo Actual'];
    let csv = headers.join(',') + '\n';
    
    Object.values(balance).forEach(cuenta => {
        if (cuenta.debe !== 0 || cuenta.haber !== 0 || cuenta.saldoActual !== 0) {
            const row = [
                cuenta.codigo,
                `"${cuenta.nombre}"`,
                cuenta.saldoAnterior.toFixed(2),
                cuenta.debe.toFixed(2),
                cuenta.haber.toFixed(2),
                cuenta.saldoActual.toFixed(2)
            ];
            csv += row.join(',') + '\n';
        }
    });
    
    return csv;
}

function downloadTXT(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function addAccountingDetail() {
    const container = document.getElementById('accountingDetails');
    if (!container) return;
    
    const newRow = document.createElement('div');
    newRow.className = 'detail-row';
    newRow.innerHTML = `
        <select class="account-select" required>
            <option value="">Seleccionar cuenta...</option>
        </select>
        <input type="number" step="0.01" placeholder="Debe" class="debe-input">
        <input type="number" step="0.01" placeholder="Haber" class="haber-input">
        <button type="button" onclick="removeAccountingDetail(this)">➖</button>
    `;
    
    container.appendChild(newRow);
    
    // Cargar plan contable en el nuevo select
    const select = newRow.querySelector('.account-select');
    Object.entries(PLAN_CONTABLE).forEach(([codigo, cuenta]) => {
        if (cuenta.nivel <= 4) {
            const option = document.createElement('option');
            option.value = codigo;
            option.textContent = `${codigo} - ${cuenta.nombre}`;
            select.appendChild(option);
        }
    });
    
    // Agregar event listeners para calcular totales
    const debeInput = newRow.querySelector('.debe-input');
    const haberInput = newRow.querySelector('.haber-input');
    
    [debeInput, haberInput].forEach(input => {
        input.addEventListener('input', calculateAccountingTotals);
    });
}

function removeAccountingDetail(button) {
    button.parentElement.remove();
    calculateAccountingTotals();
}

function calculateAccountingTotals() {
    const debeInputs = document.querySelectorAll('.debe-input');
    const haberInputs = document.querySelectorAll('.haber-input');
    
    let totalDebe = 0;
    let totalHaber = 0;
    
    debeInputs.forEach(input => {
        totalDebe += parseFloat(input.value) || 0;
    });
    
    haberInputs.forEach(input => {
        totalHaber += parseFloat(input.value) || 0;
    });
    
    const totalDebeElement = document.getElementById('totalDebe');
    const totalHaberElement = document.getElementById('totalHaber');
    
    if (totalDebeElement) totalDebeElement.textContent = totalDebe.toFixed(2);
    if (totalHaberElement) totalHaberElement.textContent = totalHaber.toFixed(2);
}

// ========================================
// 11. INTEGRACIÓN CON EL SISTEMA EXISTENTE
// ========================================

// Extender AppState existente si está disponible
if (typeof AppState !== 'undefined') {
  AppState.contabilidad = {
    asientos: [],
    planContable: PLAN_CONTABLE,
    ejercicioActual: new Date().getFullYear()
  };
  
  AppState.configuracion = new ConfiguracionSistema();
  AppState.auditoria = [];
}

// Hacer funciones y clases disponibles globalmente
if (typeof window !== 'undefined') {
    window.AsientoContable = AsientoContable;
    window.ReportesContables = ReportesContables;
    window.CalculadoraPlanilla = CalculadoraPlanilla;
    window.ExportadorPLE = ExportadorPLE;
    window.ExportadorPLAME = ExportadorPLAME;
    window.SistemaAuditoria = SistemaAuditoria;
    window.EmpleadoCompleto = EmpleadoCompleto;
    window.GeneradorBoletas = GeneradorBoletas;
    window.ConfiguracionSistema = ConfiguracionSistema;
    window.PLAN_CONTABLE = PLAN_CONTABLE;
    window.CONFIGURACION_PLANILLA = CONFIGURACION_PLANILLA;
    window.ROLES_PERMISOS = ROLES_PERMISOS;
    window.Validadores = Validadores;
    
    // Funciones de integración
    window.loadAccountingPlan = loadAccountingPlan;
    window.generateBalanceSheet = generateBalanceSheet;
    window.generateIncomeStatement = generateIncomeStatement;
    window.exportPLE = exportPLE;
    window.generatePayslips = generatePayslips;
    window.exportPLAME = exportPLAME;
    window.exportTRegister = exportTRegister;
    window.showAuditLogs = showAuditLogs;
    window.exportAuditReport = exportAuditReport;
    window.scheduleBackup = scheduleBackup;
    window.downloadAdvancedBackup = downloadAdvancedBackup;
    window.showUserRoles = showUserRoles;
    window.showTaxConfig = showTaxConfig;
    window.addAccountingDetail = addAccountingDetail;
    window.removeAccountingDetail = removeAccountingDetail;
    window.calculateAccountingTotals = calculateAccountingTotals;
}

// ========================================
// 12. INICIALIZACIÓN DE MÓDULOS AVANZADOS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Cargar módulos al iniciar
    console.log('✅ Módulos avanzados Tecsitel v.3 cargados');
    
    // Cargar plan contable si hay selects disponibles
    setTimeout(() => {
        loadAccountingPlan();
    }, 1000);
    
    // Registrar eventos para campos de contabilidad
    const accountingForm = document.getElementById('accountingEntryForm');
    if (accountingForm) {
        accountingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            try {
                const asiento = new AsientoContable();
                asiento.numero = document.getElementById('entryNumber')?.value;
                asiento.fecha = document.getElementById('entryDate')?.value;
                asiento.glosa = document.getElementById('entryDescription')?.value;
                
                // Validar detalles
                const detalles = document.querySelectorAll('.detail-row');
                detalles.forEach(row => {
                    const cuenta = row.querySelector('.account-select')?.value;
                    const debe = parseFloat(row.querySelector('.debe-input')?.value) || 0;
                    const haber = parseFloat(row.querySelector('.haber-input')?.value) || 0;
                    
                    if (cuenta && (debe > 0 || haber > 0)) {
                        asiento.agregarDetalle(cuenta, debe, haber);
                    }
                });
                
                asiento.validar();
                
                // Guardar asiento (simulado)
                if (!AppState.contabilidad) {
                    AppState.contabilidad = { asientos: [] };
                }
                AppState.contabilidad.asientos.push(asiento);
                
                // Registrar en auditoría
                SistemaAuditoria.registrar(
                    currentUser?.name || 'admin', 
                    'CREATE', 
                    'CONTABILIDAD', 
                    { asiento: asiento.numero }
                );
                
                if (typeof showToast === 'function') {
                    showToast('✅ Asiento contable guardado correctamente', 'success');
                }
                
                if (typeof hideModal === 'function') {
                    hideModal('newAccountingEntry');
                }
                
            } catch (error) {
                if (typeof showToast === 'function') {
                    showToast('❌ Error: ' + error.message, 'error');
                }
            }
        });
    }
    
    // Configurar eventos de configuración de empresa
    const companyForm = document.getElementById('companyConfigForm');
    if (companyForm) {
        companyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const configuracion = {
                ruc: document.getElementById('companyRuc')?.value,
                razonSocial: document.getElementById('companyName')?.value,
                direccion: document.getElementById('companyAddress')?.value,
                telefono: document.getElementById('companyPhone')?.value,
                email: document.getElementById('companyEmail')?.value,
                actividadEconomica: document.getElementById('companyActivity')?.value
            };
            
            // Validar RUC
            if (!Validadores.ruc(configuracion.ruc)) {
                if (typeof showToast === 'function') {
                    showToast('❌ RUC inválido', 'error');
                }
                return;
            }
            
            // Guardar configuración
            if (!AppState.configuracion) {
                AppState.configuracion = new ConfiguracionSistema();
            }
            
            AppState.configuracion.empresa = configuracion;
            localStorage.setItem('tecsitel_configuracion', JSON.stringify(AppState.configuracion));
            
            // Registrar en auditoría
            SistemaAuditoria.registrar(
                currentUser?.name || 'admin', 
                'UPDATE', 
                'CONFIGURACION', 
                { seccion: 'empresa' }
            );
            
            if (typeof showToast === 'function') {
                showToast('✅ Configuración de empresa guardada', 'success');
            }
            
            if (typeof hideModal === 'function') {
                hideModal('companyConfig');
            }
        });
    }
});

// Registrar actividad del usuario para auditoría si las funciones están disponibles
if (typeof window !== 'undefined' && typeof showTab === 'function') {
    const originalShowTab = window.showTab;
    window.showTab = function(tabName) {
        SistemaAuditoria.registrar(
            currentUser?.name || 'Usuario', 
            'VIEW', 
            'NAVEGACION', 
            { seccion: tabName }
        );
        return originalShowTab(tabName);
    };
}

console.log('✅ Módulos avanzados Tecsitel v.3 completamente cargados');
console.log('📊 Contabilidad: Plan PCGE, Asientos, Reportes');
console.log('👥 RRHH: Planilla, Boletas, PLAME');
console.log('🔐 Admin: Roles, Auditoría, Exportación');
console.log('⚖️ Cumplimiento: PLE, SUNAT, SUNAFIL');MovimientosContables(fechaInicio, fechaFin) {
  // Simulación - en producción consultar base de datos
  return [
    {
      fecha: '2024-01-15',
      numero: 'AST001',
      cuenta: '1041',
      glosa: 'Apertura de cuenta corriente',
      debe: 10000,
      haber: 0
    },
    {
      fecha: '2024-01-15',
      numero: 'AST001',
      cuenta: '5011',
      glosa: 'Apertura de cuenta corriente',
      debe: 0,
      haber: 10000
    }
  ];
}

function obtener