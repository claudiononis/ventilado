sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/PDFViewer",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel"

], function (Controller, MessageToast, PDFViewer,Fragment,JSONModel,ODataModel) {
    "use strict";
    var ctx;  // Variabl eglobal en el controlador para guardar el contexto
    return Controller.extend("ventilado.ventilado.controller.View1", {
         
        onInit: function () {
            this._initDatabase();       //llama a lafuncionpara inicializar la base dedatos local
            this._checkNetworkStatus();  // funcion para que elnavegador controle la conexion a internet

            //definimos e inicializamoslas variables del modelo de la pagina

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


            // Agregar el modelo con los datos de la tabla            

            // Inicializar el modelo de datos para la pagina
            var oModel = new JSONModel({
                isStarted: false,   //verdadero si se pulso el boton START
                isArrowVisible: false, // bandera para mostrar laflecha de lapantalla de escaneo
                tableData: tableDataArray  // tabla para registrar el avance
            });
            this.getView().setModel(oModel);

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
          /*  var eanInput = ctx.byId("eanInput"); // Accede a eanInput de manera diferente
            try {
                var cantidadValor = await this.obtenerCantidad(sValue);
                cantidad.setText(cantidadValor); // Establece el texto con el valor obtenido
            } catch (error) {
                console.error("Error al obtener la cantidad:", error);
                cantidad.setText("Error al obtener la cantidad"); // Maneja el error estableciendo un texto de error en cantidad
            }

            var ruta = this.getView().byId("txtRuta");
            ruta.setText(this.obtenerRuta(eanInput));// Obtiene el vaor amostrar en Ruta
            var oModel = this.getView().getModel();
            oModel.setProperty("/isArrowVisible", true);
            var descripcion = this.getView().byId("lDescripcion");
            descripcion.setText("Descripcion del producto escaneado");
            MessageToast.show("Valor ingresado: " + sValue);*/

             // Lógica a ejecutar cuando se presiona Enter en el input del EAN
            var cantidad = this.getView().byId("txtCantidad");
            var ruta = this.getView().byId("txtRuta");

            try {
                var cantidadYRuta = await this.obtenerCantidadYRuta(sValue);
                cantidad.setText(cantidadYRuta.cantidad); // Establece el texto con la cantidad obtenida
                ruta.setText(cantidadYRuta.ruta); // Establece el texto con la ruta obtenida
            } catch (error) {
                console.error("Error al obtener la cantidad y la ruta:", error);
                cantidad.setText("Error al obtener la cantidad"); // Maneja el error estableciendo un texto de error en cantidad
                ruta.setText("Error al obtener la ruta"); // Maneja el error estableciendo un texto de error en ruta
            }

            var oModel = this.getView().getModel();
            oModel.setProperty("/isArrowVisible", true);
            var descripcion = this.getView().byId("lDescripcion");
            descripcion.setText("Descripcion del producto escaneado");
            MessageToast.show("Valor ingresado: " + sValue);

        },
        //   Aca se hacen los calculos para mostrar los numeros GRANDES de la pantalla
        obtenerCantidadYRuta: async function(eanInput) {
            try {
                var datos = await this.onGetData(eanInput); // Realiza una sola lectura de la tabla
                return { cantidad: datos.Cantidad, ruta: datos.Ruta }; // Devuelve un objeto con la cantidad y la ruta
            } catch (error) {
                console.error("Error al obtener la cantidad y la ruta:", error);
                return { cantidad: null, ruta: null }; // o cualquier otro valor predeterminado si lo prefieres
            }
        },


//*******  Funcion para descargar las etiquetas  ****** */ 
        onGeneratePDF: function () {

            var sUrl = window.location.href;
            console.log("URL completa del navegador:", sUrl);
            var sServiceURL;
            // Cambiar aquí por las direcciones reales de QAS y productivo
            if (window.location.hostname.indexOf("desa") !== -1 || window.location.hostname.indexOf("localhost") !== -1) {
                sServiceURL = "http://erpdesa.intra.clvsa.com.ar:8000/sap/opu/odata/sap/ZVENTILADO_SRV/";
            } else if (window.location.hostname.indexOf("test") !== -1) {
                sServiceURL = "http://erptest.intra.clvsa.com.ar:8000/sap/opu/odata/sap/ZVENTILADO_SRV/";
            } else if (window.location.hostname.indexOf("prod") !== -1) {
                sServiceURL = "http://erpprod.intra.clvsa.com.ar:8000sap/opu/odata/sap/ZVENTILADO_SRV/";
            } else {
                MessageToast.show("Entorno desconocido");
                return;
            }



            var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/", {
                useBatch: false  // Deshabilitar batch requests, actualizo de a un registro.
            });
            //Se envian los datos para las etiquetas

            var oData = {
                "Dni": "1",
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
        onCodeInputConfirm: function() {
            var codeInput = this.byId("codeInput");
            var inputValue = codeInput.getValue();

            // Transferir el valor ingresado al campo de entrada principal
            var mainInput = this.getView().byId("edtCI");
            mainInput.setText(inputValue);
            this.byId("dialogoCI").close();

            
    
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
            this.crud("READ", "zprueba", "", "");
        },
        onCrudBorrar: function() {

            this.crud("BORRAR", "zprueba", "", "");
        },


//*******  Inicio  Funciones para el CRUD  *******/  
        crud: function(operacion , tabla,oValor, adicionales ){
            var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/", {                
                useBatch: false,
                defaultBindingMode: "TwoWay",
                deferredGroups: ["batchGroup1"]
            });
            var sEntitySet  = "/" + tabla + "Set"
            if (operacion == "READ"  ){
                oModel.read(sEntitySet, {
                    //Se leen los datos del backend 
                    success: function (oData) {
                        oData.results.forEach(function (item) {
                        console.log(item);
                        }
                        );        
                        console.log("Datos copiados con éxito.");
                    }.bind(this),
                    error: function (oError) {
                        console.error("Error al leer datos del servicio OData:", oError);
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
                    if (index < oValor.length) {
                        createRecord(oValor[index], function() {
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
                updateRecords(oValor);

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
                    var sPath = "/zpruebaSet(" + dni + ")";
                    oModel.remove(sPath, {
                        success: function () {
                            MessageToast.show("Registro " + dni + " eliminado con éxito.");
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

    //Se crea la base local con todos sus campos para el transporte que se ventilara
    //Ver de hacer un function impor y traer labase, luego volcarla aca
    var request = indexedDB.open("ventiladoLocal", 1);

    request.onerror = function (event) {
        console.error("Error al abrir la base de datos:", event.target.errorCode);
    };

    request.onupgradeneeded = function (event) {
        var db = event.target.result;
        // crear la tabla y los campos claves
        var objectStore = db.createObjectStore("zprueba", { keyPath: "Dni" });

        // crear los campos
        objectStore.createIndex("Nombre", "Nombre", { unique: false });
        objectStore.createIndex("Apellido", "Apellido", { unique: false });
        console.log("Almacén de objetos creado con éxito.");
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
    oModel.read("/zpruebaSet", {
       
        success: function (oData) {
            var transaction = this.db.transaction(["zprueba"], "readwrite");
            var objectStore = transaction.objectStore("zprueba");

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

onAddData: function () {
    var transaction = this.db.transaction(["zprueba"], "readwrite");
    var objectStore = transaction.objectStore("zprueba");
    var requestAdd = objectStore.add({ Dni: "1234567890", Nombre: "Juan", Apellido: "Perez" });

    requestAdd.onsuccess = function (event) {
        console.log("Dato agregado con éxito.");
    };

    requestAdd.onerror = function (event) {
        console.error("Error al agregar el dato:", event.target.errorCode);
    };
},

onGetData: function (key) {
    return new Promise(function(resolve, reject) {
        var transaction = this.db.transaction(["zprueba"], "readonly");
        var objectStore = transaction.objectStore("zprueba");
        var requestGet = objectStore.get(key);

        requestGet.onsuccess = function (event) {
            if (event.target.result) {
                var data = event.target.result;
                var cantidad = data.Nombre;//aca va la cantidad
                var ruta = data.Apellido;// aca la ruta
                var result = {
                    Cantidad: cantidad, 
                    Ruta: ruta
                };
                resolve(result); // Resuelve la promesa con un objeto que contiene los valores de Nombre y Apellido
            } else {
                reject("Dato no encontrado."); // Rechaza la promesa si no se encuentra el dato
            }
        };

        requestGet.onerror = function (event) {
            reject("Error al leer el dato: " + event.target.errorCode); // Rechaza la promesa en caso de error
        };
    }.bind(this));
},


onDeleteData: function () {
    var transaction = this.db.transaction(["zprueba"], "readwrite");
    var objectStore = transaction.objectStore("zprueba");
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