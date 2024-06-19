sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/PDFViewer",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",

], function (Controller, MessageToast, PDFViewer,Fragment,JSONModel,ODataModel,Filter,FilterOperator) {
    "use strict";
    var ctx;  // Variabl eglobal en el controlador para guardar el contexto
    return Controller.extend("ventilado.ventilado.controller.View1", {
         
        onInit: function () {
            this._initDatabase();
            this._checkNetworkStatus();  // funcion para que el navegador controle la conexion a internet

            // Definir un objeto para contener los datos de la tabla con el avance- Productos escaneados ,cubetas etc
            var tableData = {};

            // Definir los nombres de las columnas
            var columnNames = ["Ruta", "TOT", "SCAN", "FALTA", "Cub TEO", "C Real", "Pa"];

            // Rellenar el objeto con propiedades vacías para cada columna
            columnNames.forEach(function(column) {
                tableData[column] = "";
            });

            // Agregar más registros al modelo- aca ver como en el problema real sea la tabla entera con los totales y las cubetas TEORICAS
            var nuevosRegistros = [
                {"Ruta": "05", "TOT": "10", "SCAN": "5", "FALTA": "5", "Cub TEO": "15", "C Real": "3", "Pa": "2"},
                {"Ruta": "02", "TOT": "10", "SCAN": "5", "FALTA": "5", "Cub TEO": "15", "C Real": "3", "Pa": "2"},
                {"Ruta": "03", "TOT": "15", "SCAN": "10", "FALTA": "5", "Cub TEO": "20", "C Real": "4", "Pa": "3"}
            ];

            // Definir un array para contener los registros de la tabla
            var tableDataArray = [];

            // Agregar los nuevos registros al array
            nuevosRegistros.forEach(function(registro) {
                var nuevoRegistro = {};
                // Asignar cada valor del registro al correspondiente nombre de columna
                columnNames.forEach(function(column) {
                    nuevoRegistro[column] = registro[column];
                });
                // Agregar el nuevo registro al array
                tableDataArray.push(nuevoRegistro);
            });

            //Recupero el modelo global 
            //var oGlobalModel = this.getView().getModel("globalModel");
            var oGlobalModel = this.getOwnerComponent().getModel("globalModel");

           
            // Agregar el modelo con los datos de la tabla           

            // Inicializar el modelo de datos para la pagina
            var oModel = new JSONModel({
                isStarted:      false,   //verdadero si se pulso el boton START
                isArrowVisible: false, // bandera para mostrar laflecha de lapantalla de escaneo
                tableData:      tableDataArray , // tabla para registrar el avance
                puesto:        "Estacion de trabajo Nro: " + oGlobalModel.getData().puesto,
                transporte:    "Reparto: "  +oGlobalModel.getData().reparto,
                cuenta: 0,
                cantidad : 0,
                ruta: 0,
                ean :""
            });
            this.getView().setModel(oModel);   
            
            
            // Crear un modelo local para almacenar los datos
            var oLocalModel = new sap.ui.model.json.JSONModel({
                codConfirmacionData: []
            });
            this.getView().setModel(oLocalModel, "localModel");
    
            // Llamar a la función para leer los datos del backend
            this._fetchCodConfirmacionData();
                    
            
        },
        _findRouteByEAN: function(ean) {
            var oLocalModel = this.getView().getModel("localModel");
            var aCodConfirmacionData = oLocalModel.getProperty("/codConfirmacionData");
        
            // Buscar el EAN en el array de datos
            var foundItem = aCodConfirmacionData.find(function(item) {
                return item.Ean === ean;
            });
        
            if (foundItem) {
                return foundItem.Ruta;
            } else {
                console.log("EAN no encontrado.");
                return null;
            }
        },
        _fetchCodConfirmacionData: function() {
            var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/");
            
            oModel.read("/CodConfirmacionSet", {
                success: function (oData) {
                    var oLocalModel = this.getView().getModel("localModel");
        
                    // Verificar si oData.results es un array
                    if (Array.isArray(oData.results)) {
                        // Si es un array, guardar todos los items en el modelo local
                        oLocalModel.setProperty("/codConfirmacionData", oData.results);
                    } else {
                        // Si no es un array, manejar el único item directamente
                        var item = oData.results;
                        oLocalModel.setProperty("/codConfirmacionData", [item]);
                    }
                    console.log("Datos copiados con éxito.");
                }.bind(this),
                error: function (oError) {
                    console.error("Error al leer datos del servicio OData:", oError);
                }
            });
        },

        onInputChange1: function(oEvent) {  
            // Obtener el valor del input modificado
            var newValue = oEvent.getParameter("value");

            // Obtener el contexto del ítem
            var oContext = oEvent.getSource().getBindingContext();

            // Obtener el modelo asociado al controlador
            var oModel = this.getView().getModel();

            // Actualizar el valor en el modelo
            oModel.setProperty(oContext.getPath() + "/C Real", newValue);
           
        },
        onInputChange2: function(oEvent) {
            // Obtener el valor del input modificado
            var newValue = oEvent.getParameter("value");

            // Obtener el contexto del ítem
            var oContext = oEvent.getSource().getBindingContext();

            // Obtener el modelo asociado al controlador
            var oModel = this.getView().getModel();

            // Actualizar el valor en el modelo
            oModel.setProperty(oContext.getPath() + "/Pa", newValue);
            
        },

        _checkNetworkStatus: function () {
            if (navigator.onLine) {
                MessageToast.show("Conexión a internet disponible.");
            } else {
                MessageToast.show("No hay conexión a internet.");
            }
        },

        _updateNetworkStatus: function () {
            this._checkNetworkStatus();
        },

        // Arranca el escaneo
        onStartPress:function (){

            var oModel = this.getView().getModel();
            oModel.setProperty("/isStarted", true);
            var Input = this.getView().byId("eanInput");              
            setTimeout(function() {
                Input.focus();
            }, 0);
            ctx=this.getView();
            document.body.addEventListener('click', function(event) {
            // Manejar el evento clic del cuerpo de la página
            var eanInput = ctx.byId("eanInput"); 
            eanInput.focus();
            
            });

        },

        onEanInputSubmit: function (oEvent) {
            // Detectar cuando se presiona Enter en el input del EAN
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue();
            // Ejecutar la función deseada
            this.handleEanEnter(sValue);
        },

        handleEanEnter: async function (sValue) {
             // Lógica a ejecutar cuando se presiona Enter en el input del EAN
            var cantidad = this.getView().byId("txtCantidad");
     
             // Lógica a ejecutar cuando se presiona Enter en el input del EAN
            var cantidad = this.getView().byId("txtCantidad");
            var ruta = this.getView().byId("txtRuta");
            var descripcion = this.getView().byId("lDescripcion");
            var oModel = this.getView().getModel();
            try {
                //this.agregarAlLog();
                var cantidadYRuta = await this.obtenerCantidadYRuta(sValue);
                var cantidadActual = oModel.getProperty("/cantidad");
                var sEan = oModel.getProperty("/ean");
                // Leer el valor actual de la propiedad 'cuenta'
                var cuentaActual = oModel.getProperty("/cuenta");
                if (cantidadYRuta.cantidad > 0 && cantidadActual == 0 && sEan == ""){
                    cantidad.setText(cantidadYRuta.cantidad); // Establece el texto con la cantidad obtenida
                    ruta.setText(cantidadYRuta.ruta); // Establece el texto con la ruta obtenida                    
                    descripcion.setText(cantidadYRuta.descripcion); // Establece el texto con la descripcion
                     // Incrementar el valor
                     var nuevaCuenta = cuentaActual + 1;
 
                     // Establecer el nuevo valor en el modelo
                     oModel.setProperty("/cantidad", cantidadYRuta.cantidad);
                     oModel.setProperty("/cuenta", nuevaCuenta);
                     oModel.setProperty("/ean", sValue);
                   //  this.agregarLog();
                }
                else if (cantidadYRuta.cantidad > 0 && cantidadYRuta.cantidad  > cuentaActual && sEan == sValue){
                  // Incrementar el valor
                  var nuevaCuenta = cuentaActual + 1;
 
                  // Establecer el nuevo valor en el modelo
                  oModel.setProperty("/cantidad", cantidadYRuta.cantidad);
                  oModel.setProperty("/cuenta", nuevaCuenta);
                }
                else if (cantidadYRuta.cantidad > 0 && cantidadYRuta.cantidad  == cuentaActual && sEan == sValue){
                        console.log("Error ya estan todos los productos");
                }
                else if(sEan != sValue){
                    var ruta = this._findRouteByEAN(sValue);

                    if (ruta) {
                        // Si se encuentra la ruta, realizar las acciones necesarias
                        console.log("Ruta encontrada:", ruta);
                        // Por ejemplo, puedes establecer la ruta en el modelo o realizar otras operaciones
                        var oLocalModel = this.getView().getModel("localModel");
                        oLocalModel.setProperty("/rutaEncontrada", ruta);
                    } else {
                        // Si no se encuentra la ruta, manejar el caso adecuadamente
                        console.log("No se encontró la ruta para el EAN proporcionado.");
                    }
                    console.log("ver si es confirmacion")
                }
            } catch (error) {
                console.error("Error al obtener la cantidad y la ruta:", error);
                cantidad.setText("Error al obtener la cantidad"); // Maneja el error estableciendo un texto de error en cantidad
                ruta.setText("Error al obtener la ruta"); // Maneja el error estableciendo un texto de error en ruta
            }

            var oModel = this.getView().getModel();
            oModel.setProperty("/isArrowVisible", true);
            var descripcion = this.getView().byId("lDescripcion");
            MessageToast.show("Valor ingresado: " + sValue);

        },
        //   Aca se hacen los calculos para mostrar los numeros GRANDES de la pantalla
        obtenerCantidadYRuta: async function(eanInput) {
           
            try {
                var datos = await this.onGetData(eanInput); // Realiza una sola lectura de la tabla
                return { cantidad: datos.Cantidad, ruta: datos.Ruta, descripcion: datos.descripcion }; // Devuelve un objeto con la cantidad y la ruta
            } catch (error) {
               // console.error("Error al obtener la cantidad y la ruta:", error);
                return { cantidad: -1, ruta: -1 , descripcion:""}; // o cualquier otro valor predeterminado si lo prefieres
            }
        },


//*******  Funcion para descargar las etiquetas  ****** */ 
        onGeneratePDF: function () {

            var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/", {
                useBatch: false  // Deshabilitar batch requests, actualizo de a un registro.
            });
            //Se envian los datos para las etiquetas

            var oData = {
                "Dni": 1,
                "Nombre": "value2",
                "Apellido":"erere",
            };
            ctx=this.getView(); //guardo el contexto
            oModel.create("/zpruebaSet", oData, {
                success: function(oData, response) {
                    // Después de que se cree la entidad con éxito, genera la URL para el PDF
                 var sServiceURL = oModel.sServiceUrl;
                    var sSource = sServiceURL + "/sFormSet(Fname='ZETIQUETAS')/$value";
                    
                    // Crear y abrir el PDFViewer
                    var opdfViewer = new sap.m.PDFViewer();
                    ctx.addDependent(opdfViewer);
                    opdfViewer.setSource(sSource);
                    opdfViewer.setTitle("Etiquetas del Reparto");
                    opdfViewer.open();  
                }.bind(this),
                error: function(oError) {
                    sap.m.MessageToast.show("Error al enviar datos al backend");
                }
            });

        },
//********* */ fin  descarga de etiquetas   ********/


        // Método para abrir el diálogo del código interno
        onOpenCodeInputDialog: function() {
           
           //Cargamos el Dialogo
            var oView = this.getView();            
            if (!this.byId("dialogoCI")) {
             // load asynchronous XML fragment
             Fragment.load({
              id: oView.getId(),
              name: "ventilado.ventilado.view.CodeInputDialog",// todo el camino incluido el nombre del XML
              controller: this
            }).then(function (oDialog) {
            // connect dialog to the root view 
            //of this component (models, lifecycle)
                oView.addDependent(oDialog);
                oDialog.open();
               });
             } else {
                 this.byId("dialogoCI").open();
                  }
        },
             
        // Método para manejar la confirmación del valor ingresado en el diálogo del código interno
        onCodeInputConfirm: async function() {
            var codeInput = this.byId("codeInput");
            var inputValue = codeInput.getValue();

            // Transferir el valor ingresado al campo de entrada principal
            var mainInput = this.getView().byId("edtCI");
            mainInput.setText(inputValue);
            //Buscar en la base de datos

            this.byId("dialogoCI").close();
//  buscar  el EAN del codigo interno ingresado y poner el valor de EAN en el eanInput
            var datos = await this.onGetData2(inputValue);
            var eanInput = this.byId("eanInput");
            eanInput.setValue(datos.ean);// Muestra valor de EAN recuperado
           // Llamar a la función handleEanEnter
           this.handleEanEnter(datos.ean);
     
        },

        // Método para manejar el evento afterClose del diálogo
        onCodeInputDialogClose: function(oEvent) {
                // Limpiar el campo de entrada del diálogo
                var codeInput = this.byId("codeInput");
                codeInput.setValue("");
                // Devolver el foco al input del EAN
                var eanInput = this.byId("eanInput");
                eanInput.focus();
            
        },

        onPessParcialDialog:function(){
             //Cargamos el Dialogo
             var oView = this.getView();            
             if (!this.byId("parcial")) {
              // load asynchronous XML fragment
              Fragment.load({
               id: oView.getId(),
               name: "ventilado.ventilado.view.ParcialDialog",
               controller: this
             }).then(function (oDialog) {
             // connect dialog to the root view 
             //of this component (models, lifecycle)
                 oView.addDependent(oDialog);
                 oDialog.open();
                });
              } else {
                  this.byId("dialogoParcial").open();
                   }

        },
      
        // Método para manejar la confirmación del valor ingresado en el diálogo del código interno
        onParcialConfirm: function() {
            var parcial = this.byId("parcial");
            var inputValue = parcial.getValue();

            // Transferir el valor ingresado  a la logica

            this.byId("dialogoParcial").close();            
    
        },

        // Método para manejar el evento afterClose del diálogo
        onParcialDialogClose: function(oEvent) {
                // Limpiar el campo de entrada del diálogo
                var parcial = this.byId("parcial");
                parcial.setValue("");
                // Devolver el foco al input del EAN
                var eanInput = this.byId("eanInput");
                eanInput.focus();
            
        },  
        
         // Método para abrir el diálogo Stop
         onStopDialog: function() {
           
            //Cargamos el Dialogo  
            var oView = this.getView();            
            if (!this.byId("dialogStop")) {
             // load asynchronous XML fragment
             Fragment.load({
              id: oView.getId(),
              name: "ventilado.ventilado.view.StopDialog",
              controller: this
            }).then(function (oDialog) {
            // connect dialog to the root view 
            //of this component (models, lifecycle)
                oView.addDependent(oDialog);
                oDialog.open();
               });
             } else {
                 this.byId("dialogoStop").open();
                  }
         },
          // Método para manejar la confirmación del valor ingresado en el diálogo Stop
        onStopConfirm: function() {
            var stop = this.byId("stopInput");
            var inputValue = stop.getValue();

            // Transferir el valor ingresado  a la logica

            this.byId("dialogoStop").close();            
    
        },
        // Método para manejar el evento afterClose del diálogo
        onStopDialogClose: function(oEvent) {
            // Limpiar el campo de entrada del diálogo
            var parcial = this.byId("stopInput");
            parcial.setValue("");
            // Devolver el foco al input del EAN
           // var eanInput = this.byId("eanInput");
           // eanInput.focus();
        },

//******  Llamada ejemplos alCRUD  *****************/
        
        onCrudCrear: function() {
            var createData = [
                { "Dni": 2, "Nombre": "Nombre2", "Apellido": "Apellido2" },
                { "Dni": 3, "Nombre": "Nombre3", "Apellido": "Apellido3" }
            ];
            this.crud("CREAR", "zprueba", createData, "");
        },
        onCrudUpdate: function() {
            var updatedData =[{ "Dni": 14, "Nombre": "NombAct10", "Apellido": "ApelliAo" },
                              { "Dni": 15, "Nombre": "NombAct11", "Apellido": "ApelliAct" }
            ] ;
            this.crud("ACTUALIZAR", "zprueba", updatedData, "");
        },         

        onCrudRead: function() {
            this.crud("READ", "ventilado", "", "");
           
        },
        onCrudBorrar: function() {

           // this.crud("BORRAR", "zprueba", "", "");
           this.crud("FI", "zprueba", "", "");
        },


//*******  Inicio  Funciones para el CRUD  *******/  
        crud: function(operacion , tabla,oValor1, oValor2 ){
            var ctx = this; 
            var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/", {                
                useBatch: false,
                defaultBindingMode: "TwoWay",
                deferredGroups: ["batchGroup1"]
            });
            oModel.refreshMetadata();
            var sEntitySet  = "/" + tabla + "Set"
            
            if (operacion == "READ"  ){

            // Configurar los filtros
           var aFilters = [];

            aFilters.push(new Filter("Transporte", FilterOperator.EQ, oValor1));
            aFilters.push(new Filter("Entrega", FilterOperator.EQ, oValor2));

            // Hacer la llamada OData
         
            oModel.read(sEntitySet, {    
                filters: aFilters,
                success: function (oData) {
                    // Manejar datos exitosamente
                    console.log(oData);
                },
                error: function (oError) {
                    // Manejar errores
                    console.error(oError);
                }
            });

            }
            else if (operacion == 'FI'){
                var sTransporte = "0000001060";
                var sPtoPlanificacion = "1700";
                oModel.callFunction("/GenerarTransporte", {
                    method: "GET",
                    urlParameters: {
                      transporte: sTransporte, // Pass parameters directly as strings
                      pto_planificacion: sPtoPlanificacion
                    },
                    success: function (oData) {
                      // Manejar éxito
                      MessageToast.show("Se cargaron los datos para el ventilado");
                      // Procesar la respuesta aquí
                        var transporte = oData.Transporte;
                        var entrega = oData.Entrega;
                        var pto_planificacion = oData.Pto_planificacion;
                        var estado = oData.Ean;

                        // Aquí puedes trabajar con los datos recibidos
                        console.log("Transporte: ", transporte);
                        console.log("Pto Entrega: ", pto_planificacion); 
                        console.log("Entrega: ", entrega);
                        console.log("Estado: ", estado);  

                        ctx.crud("READ", "ventilado", transporte, "1700");// se leen los datos del transporte 
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
            }

            else if(operacion == "CREAR")  {

                var createRecord = function(oEntry, onSuccess, onError) {
                    var sEntitySet  = "/" + tabla + "Set"
                    oModel.create(sEntitySet, oEntry, {
                        success: function () {
                            MessageToast.show("Registro " + oEntry.Dni + " creado con éxito.");
                            if (onSuccess) onSuccess();
                        },
                        error: function (oError) {
                            MessageToast.show("Error al crear el registro " + oEntry.Dni);
                            console.error(oError);
                            if (onError) onError(oError);
                        }
                    });
                };
            
                var createNext = function(index) {
                    if (index < oValor1.length) {
                        createRecord(oValor1[index], function() {
                            createNext(index + 1);
                        });
                    } else {
                        MessageToast.show("Todos los registros se han creado con éxito.");
            
                    }
                }.bind(this);
            
                createNext(0);
            }
            else if(operacion == "ACTUALIZAR" ) {
             // Definir la función updateRecord

                var updateRecord = function(oEntry, onSuccess, onError) {
                    // La ruta debe estar construida correctamente según el modelo y los datos
                    var sEntitySet  = "/" + tabla + "Set"
                    var sPath = sEntitySet+"(" + oEntry.Dni + ")";  // Ajusta esta ruta según tu modelo OData
                    oModel.update(sPath, oEntry, {
                        success: function () {
                            MessageToast.show("Registro " + oEntry.Dni + " actualizado con éxito.");
                            if (onSuccess) onSuccess();
                        },
                        error: function (oError) {
                            MessageToast.show("Error al actualizar el registro " + oEntry.Dni);
                            console.error(oError);
                            if (onError) onError(oError);
                        }
                    });
                };

                // Función para actualizar los registros secuencialmente
                var updateRecords = function(aData) {
                    var updateNext = function(index) {
                        if (index < aData.length) {
                            updateRecord(aData[index], function() {
                                updateNext(index + 1);
                            });
                        } else {
                            MessageToast.show("Todos los registros se han actualizado con éxito.");
                        }
                    }.bind(this);
                    updateNext(0);
                };
                updateRecords(oValor1);

            }            
            
        
            else if(operacion == "BORRAR" ) {
                // Define la función de éxito
                var onSuccessFunction = function() {
                    console.log("Operación exitosa");
                };

                // Define la función de error
                var onErrorFunction = function(error) {
                    console.error("Error:", error);
                };

                // Define la función deleteRecord
                var deleteRecord = function(dni, onSuccess, onError, additionalParameter) {
                    var sPath = "/zpruebaSet(" + id + ")";
                    oModel.remove(sPath, {
                        success: function () {
                            MessageToast.show("Registro " + id + " eliminado con éxito.");
                            if (onSuccess) onSuccess();
                        },
                        error: function (oError) {
                            MessageToast.show("Error al eliminar el registro " + dni);
                            console.error(oError);
                            if (onError) onError(oError);
                        }
                    });
                
                    // Ejemplo de uso del parámetro adicional
                    console.log("Additional Parameter:", additionalParameter);
                };
                // Ejemplo de uso:
var dniToDelete = 3;
deleteRecord(dniToDelete, onSuccessFunction, onErrorFunction, "additionalParameter");
 
            }
        },

//******* Fin  Funciones para el CRUD  *******/   
     
/////////   Funciones  base offline
_initDatabase: function () {
    var dbName = "ventiladoLocal";

    // Abrir una conexión a la base de datos para asegurarte de que esté cerrada
    var request = indexedDB.open(dbName);
    
    // Manejar el evento de éxito de apertura
    request.onsuccess = function(event) {
        // Cerrar la base de datos si está abierta
        var db = event.target.result;
        db.close();
    
        // Ahora puedes eliminar la base de datos
        var deleteRequest = indexedDB.deleteDatabase(dbName);
    
        deleteRequest.onsuccess = function(event) {
            console.log("Base de datos borrada con éxito.");
        };
    
        deleteRequest.onerror = function(event) {
            console.error("Error al borrar la base de datos:", event.target.error);
        };


    }



    //Se crea la base local con todos sus campos para el transporte que se ventilara
    //Ver de hacer un function impor y traer labase, luego volcarla aca
    var request = indexedDB.open("ventilado", 2);

    request.onerror = function (event) {
        console.error("Error al abrir la base de datos:", event.target.errorCode);
    };

    request.onupgradeneeded = function (event) {
        var db = event.target.result;
        // crear la tabla y los campos claves
        var objectStore = db.createObjectStore("ventilado", { keyPath: "Id" });

        // crear los campos
       // objectStore.createIndex("Nombre", "Nombre", { unique: false });
       // objectStore.createIndex("Apellido", "Apellido", { unique: false });

         objectStore.createIndex("Fecha","Fecha", { unique: false });
         objectStore.createIndex("Transporte","Transporte", { unique: false });
         objectStore.createIndex("Entrega","Entrega", { unique: false });
        objectStore.createIndex("Nonbre_destinatario","Nonbre_destinatario", { unique: false });
         objectStore.createIndex("Calle","Calle", { unique: false });
         /* objectStore.createIndex("Lugar_destinatario","Lugar_destinatario"
         objectStore.createIndex("Codigo_interno","Codigo_interno"
         objectStore.createIndex("Descricion","Descricion"
         objectStore.createIndex("Cantidad_entrega","Cantidad_entrega"
         objectStore.createIndex("Lugar_p_disp","Lugar_p_disp"
         objectStore.createIndex("Cant_escaneada","Cant_escaneada"
         objectStore.createIndex("Ean","Ean"
         objectStore.createIndex("Preparador"Preparador"*/


        console.log("Almacén de objetos creado con ,:éxito.");
    };

    request.onsuccess = function (event) {
        this.db = event.target.result;
        console.log("Base de datos abierta con éxito.");
        this._fetchAndStoreOData(); //Luego de abrir la base se guardan los datos
    }.bind(this);
},

_fetchAndStoreOData: function () {
    var oModel = new ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/");
    //Se leen los datos del backend de la tabla
    oModel.read("/ventiladoSet", {
       
        success: function (oData) {
            var transaction = this.db.transaction(["ventilado"], "readwrite");
            var objectStore = transaction.objectStore("ventilado");

            oData.results.forEach(function (item) {
                objectStore.put(item);
            });

            console.log("Datos copiados con éxito.");
        }.bind(this),
        error: function (oError) {
            console.error("Error al leer datos del servicio OData:", oError);
        }
    });
},

/*onAddData: function () {
    var transaction = this.db.transaction(["ventilado"], "readwrite");
    var objectStore = transaction.objectStore("ventilado");
    var requestAdd = objectStore.add({ Dni: "1234567890", Nombre: "Juan", Apellido: "Perez" });

    requestAdd.onsuccess = function (event) {
        console.log("Dato agregado con éxito.");
    };

    requestAdd.onerror = function (event) {
        console.error("Error al agregar el dato:", event.target.errorCode);
    };
},*/

onGetData: function (key) {
    ctx = this;
    var sKey = key;
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open("ventilado", 2); // Asegúrate de usar la misma versión

        request.onsuccess = function(event) {
            var db = event.target.result;
            var transaction = db.transaction(["ventilado"], "readonly");
            var objectStore = transaction.objectStore("ventilado");
         
            // Verificar si el índice "Ean" existe
          
                if (!objectStore.indexNames.contains("Ean")) {
                    console.error("El índice 'Ean' no se encontró.");
                    return;
                }

            var index = objectStore.index("Ean");

            var getRequest = index.get(key);

            getRequest.onsuccess = function(event) {
                var data = event.target.result;
                if (data) {
                    console.log("Registro encontrado:", data);
                    // Aquí puedes manejar el registro encontrado
                     // Accediendo a cada campo del registro
                    var id = data.Id;
                    var ean = data.Ean;
                    var fecha = data.Fecha;
                    var transporte = data.Transporte;
                    var entrega = data.Entrega;
                    var nonbreDestinatario = data.NonbreDestinatario;
                    var calle = data.Calle;
                    var lugarDestinatario = data.LugarDestinatario;
                    var codigoInterno = data.CodigoInterno;
                    var descripcion = data.Descricion;
                    var cantidadEntrega = data.CantidadEntrega;
                    var lugarPDisp = data.LugarPDisp;
                    var cantEscaneada = data.CantEscaneada;
                    var preparador = data.Preparador;
                    var estado = data.Estado;
                    var cantidad = data.CantidadEntrega;//aca va la cantidad
                    var ruta = data.LugarPDisp;// aca la ruta
                    var result = {
                        Cantidad: cantidad, 
                        Ruta: ruta,
                        descripcion:descripcion
                    };



                    resolve(result); // Resuelve la promesa con un objeto que contiene los valores de cantidad y Ruta
                } else {
                    console.log("No se encontró ningún registro con el EAN proporcionado.");
                    // Busca para ver si es un Codigo de confirmacion
                    var ruta = ctx._findRouteByEAN(sKey);

                    if (ruta) {
                        // Si se encuentra la ruta, realizar las acciones necesarias
                        console.log("Ruta encontrada:", ruta);
                        // Ver si ya se completa la cantidad escaneada 
                        var oModel = ctx.getView().getModel();
                        if(oModel.getProperty("/cuenta")==oModel.getProperty("/cantidad")){
                            console.log("Confirmado");
                        }
                        else{
                            console.log("falta escanear");
                        }
                       
                    } else {
                        // Si no se encuentra la ruta, manejar el caso adecuadamente
                        console.log("No se encontró la ruta para el EAN proporcionado.");
                    }
                }
            };

            getRequest.onerror = function(event) {
                console.log("Error al buscar el registro:", event.target.error);
            };
        };

        request.onerror = function(event) {
            console.log("Error al abrir la base de datos:", event.target.error);
        };
    }.bind(this));
},
/////

onGetData2: function (key) {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open("ventilado", 2); // Asegúrate de usar la misma versión

        request.onsuccess = function(event) {
            var db = event.target.result;
            var transaction = db.transaction(["ventilado"], "readonly");
            var objectStore = transaction.objectStore("ventilado");
         
            // Verificar si el índice "Codigo interno" existe
          
                if (!objectStore.indexNames.contains("Codigo_interno")) {
                    console.error("El índice 'Codigo interno' no se encontró.");
                    return;
                }

            var index = objectStore.index("Codigo_interno");

            var getRequest = index.get(key);

            getRequest.onsuccess = function(event) {
                var data = event.target.result;
                if (data) {
                    console.log("Registro encontrado:", data);
                    // Aquí puedes manejar el registro encontrado
                     // Accediendo a cada campo del registro
                    var id = data.Id;
                    var ean = data.Ean;
                    var fecha = data.Fecha;
                    var transporte = data.Transporte;
                    var entrega = data.Entrega;
                    var nonbreDestinatario = data.NonbreDestinatario;
                    var calle = data.Calle;
                    var lugarDestinatario = data.LugarDestinatario;
                    var codigoInterno = data.CodigoInterno;
                    var descripcion = data.Descricion;
                    var cantidadEntrega = data.CantidadEntrega;
                    var lugarPDisp = data.LugarPDisp;
                    var cantEscaneada = data.CantEscaneada;
                    var preparador = data.Preparador;
                    var estado = data.Estado;
                    var cantidad = data.CantidadEntrega;//aca va la cantidad
                    var ruta = data.LugarPDisp;// aca la ruta
                    var result = {
                        Cantidad: cantidad, 
                        Ruta: ruta,
                        descripcion:descripcion,
                        ean: ean
                    };



                    resolve(result); // Resuelve la promesa con un objeto que contiene los valores de cantidad y Ruta
                } else {
                    console.log("No se encontró ningún registro con el Codigo interno proporcionado.");
                }
            };

            getRequest.onerror = function(event) {
                console.log("Error al buscar el registro:", event.target.error);
            };
        };

        request.onerror = function(event) {
            console.log("Error al abrir la base de datos:", event.target.error);
        };
    }.bind(this));
},


//////

onDeleteData: function () {
    var transaction = this.db.transaction(["ventilado"], "readwrite");
    var objectStore = transaction.objectStore("ventilado");
    var requestDelete = objectStore.delete("1234567890");

    requestDelete.onsuccess = function (event) {
        console.log("Dato eliminado con éxito.");
    };

    requestDelete.onerror = function (event) {
        console.error("Error al eliminar el dato:", event.target.errorCode);
    };
}
});
});