sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator"  // Importar BusyIndicator

], function (Controller, MessageToast, JSONModel,ODataModel,Filter,FilterOperator,MessageBox,BusyIndicator) {
    "use strict";
    var ctx= this;  // Variable eglobal en el controlador para guardar el contexto
    var sTransporte;
    var sPuesto ;
    var sReparto ;
    var sPtoPlanif ;
    var sUsuario;
    var sFecha; 
    var datosD=[];
    return Controller.extend("ventilado.ventilado.controller.Desconsolidado", {

    formatCantidadTotal: function (cantidadTotal) {
        return cantidadTotal === 0 ? "" : cantidadTotal;
    },

    formatRuta: function (cantidadTotal, ruta) {
        return cantidadTotal === 0 ? "" : ruta;
    }, 

    onInit:  function () {
        this._dbConnections = []; // Array para almacenar conexiones abiertas
        // Obtener el router y attachRouteMatched
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.getRoute("Desconsolidado").attachMatched(this.onRouteMatched, this);
        var oModel = new sap.ui.model.json.JSONModel();
        this.getView().setModel(oModel);
        // Manejar eventos de navegación - para atender cuandose va a salir de lapagina
        window.addEventListener('beforeunload', this._handleUnload.bind(this));
        window.addEventListener('popstate', this._handleUnload.bind(this));

        // Ejecutar acciones iniciales
         this.ejecutarAcciones();
    },

    onRouteMatched: async function () {
        // Ejecutar acciones cada vez que la ruta es navegada
        this.ejecutarAcciones();
    },




    ejecutarAcciones:  async function () {
            // Lerr datos locales
            sPuesto=localStorage.getItem('sPuesto');
            sReparto = localStorage.getItem('sReparto');
            sPtoPlanif = localStorage.getItem('sPtoPlanif');
            sUsuario = localStorage.getItem('sPreparador');
            var oModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oModel);
           await this.obtenerYProcesarDatos(); 

            // Objeto para almacenar los datos agrupados por código interno y descripción
            var datosAgrupados = {};
            // Objeto para almacenar los totales por ruta
            var totalesPorRuta = {};
            // Iterar sobre los datos y agrupar por código interno y descripción
            datosD.forEach(function(item) {
                var codInterno = item.CodInterno;
                var descripcion = item.Descripcion;
                var ruta = item.Ruta;
                var cantidadEscaneada = item.CantidadEscaneada;
                var entrega = item.Entrega;
                var transporte = item.Transporte;
                // Si el código interno no existe en el objeto de datos agrupados, crear un nuevo objeto para él
                if (!datosAgrupados[codInterno]) {
                    datosAgrupados[codInterno] = {
                        CodInterno: codInterno,
                        Descripcion: descripcion,
                        Transporte: transporte,
                        Entrega: entrega
                    };
                }
            
                // Agregar o actualizar la cantidad escaneada para la ruta correspondiente
                datosAgrupados[codInterno][ruta] = cantidadEscaneada;
                 // Agregar o actualizar los totales por ruta
                if (!totalesPorRuta[ruta]) {
                    totalesPorRuta[ruta] = { CantidadTotal: 0, Entrega: entrega };
                }
                totalesPorRuta[ruta].CantidadTotal += cantidadEscaneada;
            });
            
            // Convertir el objeto de datos agrupados en un array
            var arrayDatosAgrupados = [];
            
           // Iterar sobre los datos agrupados y convertirlos en un array
            for (var cod in datosAgrupados) {
                arrayDatosAgrupados.push(datosAgrupados[cod]);
            }
            
            // Mostrar el resultado final en la consola (solo para demostración)
            console.log(arrayDatosAgrupados);
            var arrayTotalesPorRuta = [];
            for (var ruta in totalesPorRuta) {
                arrayTotalesPorRuta.push({ Ruta: ruta, CantidadTotal: totalesPorRuta[ruta].CantidadTotal, Entrega: totalesPorRuta[ruta].Entrega });
            }          

            // Crear una lista de todas las posibles rutas (01 a 30)
            var todasLasRutas = [];
            for (var i = 1; i <= 30; i++) {
                todasLasRutas.push(String(i).padStart(2, '0'));
            }

            // Agregar rutas vacías si no existen en arrayTotalesPorRuta
            todasLasRutas.forEach(function(ruta) {
                if (!arrayTotalesPorRuta.some(function(item) { return item.Ruta === ruta; })) {
                    arrayTotalesPorRuta.push({ Ruta: ruta, CantidadTotal: 0, Entrega: null });
                }
            });

            // Ordenar arrayTotalesPorRuta por Ruta ascendente
            arrayTotalesPorRuta.sort(function(a, b) {
                if (a.Ruta < b.Ruta) {
                    return -1;
                }
                if (a.Ruta > b.Ruta) {
                    return 1;
                }
                return 0;
            });

            // Mostrar el array ordenado en la consola (solo para demostración)
            console.log(arrayTotalesPorRuta);

            // Crear un nuevo modelo JSON con ambos arrays
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({
                tableData: arrayDatosAgrupados,
                totalesPorRuta: arrayTotalesPorRuta
            });

            // Asignar el modelo a la vista
            this.getView().setModel(oModel);
            // Manejar eventos de navegación
            window.addEventListener('beforeunload', this._handleUnload.bind(this));
            window.addEventListener('popstate', this._handleUnload.bind(this));

        },

        obtenerYProcesarDatos: async function () {
            try {
                let datos = await this.obtenerDatosDeIndexedDB();
                datosD = this.procesarDatos(datos);
            } catch (error) {
                console.log("Error:", error);
            }
          },
          obtenerDatosDeIndexedDB: function () {
            ctx=this;
            return new Promise((resolve, reject) => {
              let request = indexedDB.open("ventilado",5);
          
              request.onerror = (event) => {
                console.log("Error al abrir la base de datos:", event);
                reject("Error al abrir la base de datos");
              };
          
              request.onsuccess = (event) => {
                let db = event.target.result;
                ctx._dbConnections.push(db); // Guardar referencia a la conexión abierta
                let transaction = db.transaction(["ventilado"], "readonly");
                let objectStore = transaction.objectStore("ventilado");
                let data = [];
          
                objectStore.openCursor().onsuccess = (event) => {
                  let cursor = event.target.result;
                  if (cursor) {
                    data.push(cursor.value);
                    cursor.continue();
                  } else {
                    resolve(data);
                  }
                };
              };
            });
          },

        procesarDatos: function(datos) {
            datos.sort(function(a, b) {
                if (a.CodInterno < b.CodInterno) {
                    return -1;
                }
                if (a.CodInterno > b.CodInterno) {
                    return 1;
                }
                return 0;
            });
            let resultado = {};            
            datos.forEach((registro) => {
               
                    resultado[registro.Id] = {
                        "Id"               : registro.Id,
                        "CodInterno"       : registro.CodigoInterno,
                        "Descripcion"      : registro.Descricion,
                        "CantidadEscaneada": registro.CantEscaneada,
                        "Ruta"             : String(registro.LugarPDisp).padStart(2,'0'),
                        "Transporte"       : registro.Transporte ,
                        "Entrega"          : registro.Entrega,                         
                    };
                
            });
            
            // Convierte el objeto resultado en un array
            let arrayResultado = Object.keys(resultado).map((ruta) => resultado[ruta]);
            
            return arrayResultado;
        },        
/******   Cuando se sale de la pagina se cierran todas las conexiones a la base local */
        onExit: function () {
            this.closeAllDbConnections(); // Cerrar todas las conexiones cuando se cierre el controlador
        },

        closeAllDbConnections: function () {
            this._dbConnections.forEach(db => {
                db.close();
            });
            this._dbConnections = []; // Resetear el array de conexiones
        },
        _handleUnload: function () {
            this.closeAllDbConnections();
        },

        onVerDesafectacionPress:function(){
            this.onExit();
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("Verdesafectacion"); 
        },   
        onDesafectacionPress: function () {
            ctx=this;
            MessageBox.warning("Se van a desafectar los materiales indicados para cada ENTREGA, confirma?", {
              actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
              onClose: function (oAction) {
                if (oAction === MessageBox.Action.OK) {
                  // Codigo para la desafectacion
                  var oModel =  ctx.getView().getModel();
                  var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/", {                
                    useBatch: false,
                    defaultBindingMode: "TwoWay",
                    deferredGroups: ["batchGroup1"]
                });
                oModel.refreshMetadata();
                BusyIndicator.show();
                oModel.callFunction("/GenerarTransporte", {  // se llama a la function import
                    method: "GET",
                    urlParameters: {
                      transporte: "BI_"+sReparto, // pasa los parametros strings
                      pto_planificacion: '0000'//sPtoPlanificacion
                    },
                    success: function (oData) {
                      // Manejar éxito
                     // MessageToast.show("Se cargaron los datos para el ventilado");
                      // Procesar la respuesta aquí
                    
                        var estado = oData.Ean;  
                        // Aquí se puede  trabajar con los datos recibidos
                        console.log("Estado: ", estado);
                        BusyIndicator.hide();  // Ocultar 
                        MessageToast.show( "Se conpleto la Desafectacion de material");
                    },
                    error: function (oError) {
                      // Manejar error
                        var sErrorMessage = "";
                        try {
                            var oErrorResponse = JSON.parse(oError.responseText);
                            sErrorMessage = oErrorResponse.error.message.value;
                        } catch (e) {
                            sErrorMessage = "Error desconocido,  revise conexion de Internet y VPN";
                        }
                        BusyIndicator.hide();  // Ocultar 
                        MessageToast.show( sErrorMessage);
                    },
                    timeout: 10000 // Establecer un tiempo de espera de 10 segundos
                  });

                }
              }
            });
          }
    });

});