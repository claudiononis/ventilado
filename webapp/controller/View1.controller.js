sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/PDFViewer",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",

], function (UIComponent,Controller, MessageToast, PDFViewer,Fragment,JSONModel,ODataModel,Filter,FilterOperator) {
    "use strict";
    var ctx;
    var sTransporte;
    return Controller.extend("ventilado.ventilado.controller.View1", {
        onInit: function () {
        var oDate = new Date();
        var oFormattedDate = this._formatDate(oDate);
 /*       var oModel = new JSONModel({
            date: oFormattedDate
        });*/
        var oFechaInput = this.byId("fecha"); // Asegúrate de que el ID del campo de entrada sea "fechaInput"
        if (oFechaInput) {
            oFechaInput.setValue(oFormattedDate);
        }
 /*       // Crear el modelo global
        var oGlobalModel = new JSONModel({
        // Asignar datos al modelo global

            reparto: "",
            operador: "",
            fecha: oFormattedDate,
            cantidad: ""
        });
        // Establecer el modelo global en el componente
        //this.setModel(oGlobalModel, "global");
        // Llamar al método init de la clase base
        //this.getView().setModel(oModel, "viewModel");
        //UIComponent.prototype.init.apply(this, arguments);*/



        },
    
        _formatDate: function (date) {
            var day = String(date.getDate()).padStart(2, '0');
            var month = String(date.getMonth() + 1).padStart(2, '0'); // Enero es 0
            var year = date.getFullYear();
            return day + '/' + month + '/' + year;
        },
         
        onScanPress: function () {      
               const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
               oRouter.navTo("Scan");                 
        },


        /*  Cuando se pulsa "Buscar datos" se ejecuta esta funcion
            Se busca el modelo y se llama a la "Function import" del back end para buscar los datos  del transporte
            a ventilar.           
        */
        onBuscarPress:function(){

            var ctx = this; 
            var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/", {                
                useBatch: false,
                defaultBindingMode: "TwoWay",
                deferredGroups: ["batchGroup1"]
            });
            oModel.refreshMetadata();
            sTransporte = ctx.getView().byId("reparto").getValue().padStart(10, '0');
            var sOperador = ctx.getView().byId("Usuario").getValue();
            var sPuesto = ctx.getView().byId("puesto").getValue();
            var sPtoPlanificacion =  ctx.getView().byId("pto_planif").getValue();

            //actualizo datos globales
            var oGlobalModel = this.getOwnerComponent().getModel("globalModel");

            if (oGlobalModel) {
                oGlobalModel.setProperty("/puesto", sPuesto);
                oGlobalModel.setProperty("/reparto", sTransporte);
            }
            oModel.callFunction("/GenerarTransporte", {  // se llama a la function import
                method: "GET",
                urlParameters: {
                  transporte: sTransporte, // pasa los parametros strings
                  pto_planificacion: sPtoPlanificacion
                },
                success: function (oData) {
                  // Manejar éxito
                  MessageToast.show("Se cargaron los datos para el ventilado");
                  // Procesar la respuesta aquí
                    var transporte = oData.Transporte;
                    transporte = transporte.padStart(10, '0');  
                    var entrega = oData.Entrega;
                    var pto_planificacion = oData.Pto_planificacion;
                    var estado = oData.Ean;  
                    // Aquí se puede  trabajar con los datos recibidos
                    console.log("Transporte: ", transporte);
                    console.log("Pto Entrega: ", pto_planificacion); 
                    console.log("Entrega: ", entrega);
                    console.log("Estado: ", estado);  
                    // leer datos del Transporte a  ventilar
                    // ylos guardaa la base local
                    ctx._initDatabase();
                   //  habilitar botones de las distintas opciones
                    ctx.getView().byId("btScan").setEnabled(true);
                    ctx.getView().byId("btLog").setEnabled(true);
                    ctx.getView().byId("btAxP").setEnabled(true);
                    ctx.getView().byId("btAxE").setEnabled(true);
                    ctx.getView().byId("btCierre").setEnabled(true);
            
                },
                error: function (oError) {
                  // Manejar error
                    var sErrorMessage = "";
                    try {
                        var oErrorResponse = JSON.parse(oError.responseText);
                        sErrorMessage = oErrorResponse.error.message.value;
                    } catch (e) {
                        sErrorMessage = "Error desconocido";
                    }
                    MessageToast.show( sErrorMessage);
                                }
              });


        },

//
/////////   Funciones para base offline
        _initDatabase: function () {
        
            //Se crea la base local con todos sus campos para el transporte que se ventilara
            //Ver de hacer un function impor y traer labase, luego volcarla aca
            var request = indexedDB.open("ventilado", 2);

            request.onerror = function (event) {
                console.error("Error al abrir la base de datos:", event.target.errorCode);
            };

            request.onupgradeneeded = function (event) {
                var db = event.target.result;
            // Si el objectStore ya existe, entonces solo actualizar los índices que faltan
            if (!db.objectStoreNames.contains("ventilado")) {
                var objectStore = db.createObjectStore("ventilado", { keyPath: "Id" });
            } else {
                var objectStore = event.target.transaction.objectStore("ventilado");
            }

            if (!objectStore.indexNames.contains("Ean")) {
                objectStore.createIndex("Ean", "Ean", { unique: false });
            }
            if (!objectStore.indexNames.contains("Fecha")) {
                objectStore.createIndex("Fecha", "Fecha", { unique: false });
            }
            if (!objectStore.indexNames.contains("Transporte")) {
                objectStore.createIndex("Transporte", "Transporte", { unique: false });
            }
            if (!objectStore.indexNames.contains("Entrega")) {
                objectStore.createIndex("Entrega", "Entrega", { unique: false });
            }
            if (!objectStore.indexNames.contains("NombreDestinatario")) {
                objectStore.createIndex("NombreDestinatario", "NombreDestinatario", { unique: false });
            }
            if (!objectStore.indexNames.contains("Nonbre_destinatario")) {
                objectStore.createIndex("Nonbre_destinatario", "Nonbre_destinatario", { unique: false });
            }
            if (!objectStore.indexNames.contains("Calle")) {
                objectStore.createIndex("Calle", "Calle", { unique: false });
            }
            if (!objectStore.indexNames.contains("Lugar_destinatario")) {
                objectStore.createIndex("Lugar_destinatario", "Lugar_destinatario", { unique: false });
            }
            if (!objectStore.indexNames.contains("Codigo_interno")) {
                objectStore.createIndex("Codigo_interno", "CodigoInterno", { unique: false });
            }
            if (!objectStore.indexNames.contains("Descricion")) {
                objectStore.createIndex("Descricion", "Descricion", { unique: false });
            }
            if (!objectStore.indexNames.contains("Cantidad_entrega")) {
                objectStore.createIndex("Cantidad_entrega", "Cantidad_entrega", { unique: false });
            }
            if (!objectStore.indexNames.contains("Lugar_p_disp")) {
                objectStore.createIndex("Lugar_p_disp", "Lugar_p_disp", { unique: false });
            }
            if (!objectStore.indexNames.contains("Cant_escaneada")) {
                objectStore.createIndex("Cant_escaneada", "Cant_escaneada", { unique: false });
            }
            if (!objectStore.indexNames.contains("Preparador")) {
                objectStore.createIndex("Preparador", "Preparador", { unique: false });
            }
            if (!objectStore.indexNames.contains("Estado")) {
                objectStore.createIndex("Estado", "Estado", { unique: false });
            }

            console.log("Almacén de objetos e índices creados con éxito.");
            
            };

            request.onsuccess = function (event) {
                this.db = event.target.result;
                console.log("Base de datos abierta con éxito.");
                this._fetchAndStoreOData(); //Luego de abrir la base se leen y guardan los datos
            }.bind(this);
        },

        _fetchAndStoreOData: function () {
            var oModel = new ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/");
            //Se leen los datos del backend filtrando por el numero de transporte
            // Configurar los filtros
            var aFilters = [];        
            aFilters.push(new Filter("Transporte", FilterOperator.EQ, sTransporte));
            oModel.read("/ventiladoSet", {
                filters: aFilters,
                success: function (oData) {
                    var transaction = this.db.transaction(["ventilado"], "readwrite");
                    var objectStore = transaction.objectStore("ventilado");
                    // Verificar si oData.results es un array
                    if (Array.isArray(oData.results)) {
                        // Si es un array, iterar sobre cada item
                        oData.results.forEach(function (item) {
                            // Completando el campo "Transporte" con ceros a la izquierda si es necesario
                            item.Transporte = (item.Transporte || '').padStart(10, '0');
                            // Guardar el item en el object store
                            objectStore.put(item);
                        });
                    } else {
                        // Si no es un array, manejar el único item directamente
                        var item = oData.results;
                        // Completando el campo "Transporte" con ceros a la izquierda si es necesario
                        item.Transporte = (item.Transporte || '').padStart(10, '0');
                        // Guardar el item en el object store
                        objectStore.put(item);
                    }
                    console.log("Datos copiados con éxito.");
                }.bind(this),
                error: function (oError) {
                    console.error("Error al leer datos del servicio OData:", oError);
                }
            });

        },
   
    });
});