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
    var ctx= this;  // Variabl eglobal en el controlador para guardar el contexto
    return Controller.extend("ventilado.ventilado.controller.View1", {
         
        onInit: function () {
            this._initDatabase();
            this._checkNetworkStatus();  // funcion para que el navegador controle la conexion a internet
            this.obtenerYProcesarDatos();           
            // Crear un modelo local para almacenar los datos
            var oLocalModel = new sap.ui.model.json.JSONModel({
                codConfirmacionData: []
            });
            this.getView().setModel(oLocalModel, "localModel");
    
            // Llamar a la función para leer los datos del backend
            this._fetchCodConfirmacionData();                   
            
        },
        obtenerDatosDeIndexedDB: function () {
            return new Promise((resolve, reject) => {
              let request = indexedDB.open("ventilado",2);
          
              request.onerror = (event) => {
                console.log("Error al abrir la base de datos:", event);
                reject("Error al abrir la base de datos");
              };
          
              request.onsuccess = (event) => {
                let db = event.target.result;
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
        obtenerYProcesarDatos: async function () {
            try {
                let datos = await this.obtenerDatosDeIndexedDB();
                let resultado = this.procesarDatos(datos);
        
                // Nombres de las columnas
                var columnNames = ["Ruta", "TOT", "SCAN", "FALTA", "Cub TEO", "C Real", "Pa"];
        
                // Mapear arrayResultado a la estructura de tableDataArray
                var tableDataArray = resultado.map((registro) => {
                    var nuevoRegistro = {};
                    columnNames.forEach((column) => {
                        nuevoRegistro[column] = registro[column] || "";
                    });
                    return nuevoRegistro;
                });
        
                // Actualizar el modelo con tableDataArray
                var oGlobalModel = this.getOwnerComponent().getModel("globalModel");
                var oModel = new sap.ui.model.json.JSONModel({
                    isStarted:      false,   // verdadero si se pulso el botón START
                    isArrowVisible: false,   // bandera para mostrar la flecha de la pantalla de escaneo
                    tableData:      tableDataArray, // tabla para registrar el avance
                    puesto:         "Estación de trabajo Nro: " + oGlobalModel.getData().puesto,
                    transporte:     "Reparto: " + oGlobalModel.getData().reparto,
                    cuenta:         0,
                    cantidad:       0,
                    ruta:           0,
                    ean:            "",
                    id : 0
                });
                this.getView().setModel(oModel);
        
                console.log(tableDataArray);
            } catch (error) {
                console.log("Error:", error);
            }
          },
        procesarDatos: function(datos) {
            let resultado = {};            
            datos.forEach((registro) => {
                let ruta = registro.LugarPDisp;
                let cantidad = registro.CantidadEntrega;            
                if (!resultado[ruta]) {
                    // Inicializa el objeto de la ruta si no existe
                    resultado[ruta] = {
                        "Ruta": ruta,
                        "TOT": 0,
                        "SCAN": 0, // Esto es un ejemplo, ajusta según tus necesidades
                        "FALTA": 0, // Esto es un ejemplo, ajusta según tus necesidades
                        "Cub TEO": 0, // Esto es un ejemplo, ajusta según tus necesidades
                        "C Real": 0, // Esto es un ejemplo, ajusta según tus necesidades
                        "Pa": 0, // Esto es un ejemplo, ajusta según tus necesidades
                        fecha: registro.fecha,  //Suponiendo que la fecha es la misma para todos los registros de la misma ruta
                        transportista: registro.transportista  // Suponiendo que el transportista es el mismo para todos los registros de la misma ruta
                    };
                }

                // Suma la cantidad al total
                resultado[ruta]["TOT"] += cantidad;
                resultado[ruta]["FALTA"] += cantidad;
                // Aquí deberías agregar lógica para calcular SCAN, FALTA, Cub TEO, C Real, Pa
            });
            
            // Convierte el objeto resultado en un array
            let arrayResultado = Object.keys(resultado).map((ruta) => resultado[ruta]);
            
            return arrayResultado;
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

       /** Inicio : Rutinas que se activan cuando se competan la cantidad de cubetas reales   */
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
/** Fin : Rutinas que se activan cuando se competan la cantidad de cubetas reales   */

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

        /////////// Arranca el escaneo  //////////////////////////////////////////


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
/**    Se dispara con el ENTER luego del EAN */
        onEanInputSubmit: function (oEvent) {
            // Detectar cuando se presiona Enter en el input del EAN
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue();
            // Ejecutar la función deseada
            this.handleEanEnter(sValue);
        },

        handleEanEnter: async function (sValue) {
             // Lógica a ejecutar cuando se presiona Enter en el input del EAN
           // var cantidad = this.getView().byId("txtCantidad");
            ctx=this;
             // Lógica a ejecutar cuando se presiona Enter en el input del EAN
            var cantidad = this.getView().byId("txtCantidad");
            var sRuta = this.getView().byId("txtRuta");
            var descripcion = this.getView().byId("lDescripcion");
            var Ean = this.getView().byId("eanInput");
            var ci = this.getView().byId("edtCI");
            var oModel = this.getView().getModel();
            try {
                //this.agregarAlLog();
                var cantidadYRuta = await this.obtenerCantidadYRuta(sValue);                
                var cantidadActual = oModel.getProperty("/cantidad");
                var sEan = oModel.getProperty("/ean");
                if (cantidadYRuta.cantidad > 0 ){
                    // Leer el valor actual de la propiedad 'cuenta'
                    var cuentaActual = oModel.getProperty("/cuenta");
                    if (cantidadYRuta.cantidad > 0 && cantidadActual == 0 && sEan == ""){
                        //***  Se inicia el ciclo de escaneo  **********/
                        cantidad.setText(cantidadYRuta.cantidad); // Establece el texto con la cantidad obtenida
                        sRuta.setText(cantidadYRuta.ruta); // Establece el texto con la ruta obtenida                    
                        descripcion.setText(cantidadYRuta.descripcion); // Establece el texto con la descripcion
                        // Incrementar el valor
                        var nuevaCuenta = cuentaActual + 1;
    
                        // Establecer el nuevo valor en el modelo
                        oModel.setProperty("/ruta", cantidadYRuta.ruta);
                        oModel.setProperty("/cantidad", cantidadYRuta.cantidad);
                        oModel.setProperty("/cuenta", nuevaCuenta);
                        oModel.setProperty("/ean", sValue);
                        oModel.setProperty("/id", cantidadYRuta.id);
                        // Actualizar tableData
                        var tableData = oModel.getProperty("/tableData");
                        // Buscar el registro correspondiente en tableData
                        tableData.forEach(function (registro) {
                            if (registro.Ruta === cantidadYRuta.ruta) {
                                // Asegurar que SCAN y FALTA son números válidos
                                registro.SCAN = parseInt(registro.SCAN, 10) || 0;
                                registro.FALTA = parseInt(registro.FALTA, 10) || 0;

                                // Incrementar SCAN y decrementar FALTA
                                registro.SCAN += 1;
                                registro.FALTA -= 1;
                            }
                        });
                         // Establecer el array actualizado en el modelo
                        oModel.setProperty("/tableData", tableData);
                    //  this.agregarLog();
                    }
                    else if (cantidadYRuta.cantidad > 0 && cantidadYRuta.cantidad  > cuentaActual && sEan == sValue){
                        //******* Se recibe un EAN igual al del que inicio el ciclo, el cual aun no finalizo */
                    // Incrementar el valor
                    var nuevaCuenta = cuentaActual + 1;
    
                    // Establecer el nuevo valor en el modelo

                    oModel.setProperty("/cuenta", nuevaCuenta);

                     // Actualizar tableData
                     var tableData = oModel.getProperty("/tableData");
                     // Buscar el registro correspondiente en tableData
                     tableData.forEach(function (registro) {
                         if (registro.Ruta === cantidadYRuta.ruta) {
                             // Asegurar que SCAN y FALTA son números válidos
                             registro.SCAN = parseInt(registro.SCAN, 10) || 0;
                             registro.FALTA = parseInt(registro.FALTA, 10) || 0;
                            if ( registro.FALTA === 0){
                                this.onOpenDialog("Ya estan todos los productos escaneados : "+oModel.getProperty("/cuenta") , "Confirme ingreso en la ruta :"+oModel.getProperty("/ruta")); 
                            }
                            else{
                                // Incrementar SCAN y decrementar FALTA
                                registro.SCAN += 1;
                                registro.FALTA -= 1;
                                //  this.agregarLog();
                            }
                         }
                     });
                      // Establecer el array actualizado en el modelo
                     oModel.setProperty("/tableData", tableData);
                    }
                    else if (cantidadYRuta.cantidad > 0 && cantidadYRuta.cantidad  == cuentaActual && sEan == sValue){
                        /********  Se recibe un EAN de un ciclo que ya esta competo */
                            console.log("Error ya estan todos los productos");
                            this.onOpenDialog("Ya estan todos los productos escaneados : "+oModel.getProperty("/cuenta") , "Confirme ingreso en la ruta :"+oModel.getProperty("/ruta"));
                    }
                    
                    else if(sEan != cantidadYRuta.ean){
                        /******  Se recibe un EAN que no corresponde al ciclo de escaneo actual *********
                         *       puede tratarse de una confirmacion o un error - Se confirma en otra ruta    *
                         ********************************************************************************/
                        var ruta = this._findRouteByEAN(sValue);

                        if (ruta) {
                            /* Se encuentra una ruta para este EAN. **
                                hay que ver si es la ruta que le corresponde al ciclo actual
                            */
                            console.log("Ruta encontrada:", ruta);
                            if(ruta == oModel.getProperty("/ruta") && cantidadYRuta.cantidad  == cuentaActual){
                                /** es la confirmacion al ciclo actual */
                                // resetea valores para iniciar el nuevo ciclo                       
                                oModel.setProperty("/ruta", 0);                         
                                oModel.setProperty("/cantidad", 0);
                                oModel.setProperty("/cuenta", 0);
                                oModel.setProperty("/ean", "");
                                
                                   //actualiza el estado 
                                var request = indexedDB.open("ventilado", 2);                             
                                request.onsuccess = function(event) {
                                    var db = event.target.result;
                                    // Llamar a la función para actualizar el campo 'Estado'
                                    ctx.actualizarEstado(db, cantidadYRuta.id, "Completo");
                                };
                                oModel.setProperty("/id", 0);
                                cantidad.setText("");
                                sRuta.setText("");
                                descripcion.setText("");
                                Ean.setValue("");
                                ci.setText("");
                            }
                            else if(ruta == oModel.getProperty("/ruta") && cantidadYRuta.cantidad  > cuentaActual){
                                console.log("Se esta confirmando en ruta correcta,", " pero no se completo la cantidad de productos")
                                this.onOpenDialog("Falta agregar productos se escaneo = "+oModel.getProperty("/cuenta") , " y el total debe ser:"+oModel.getProperty("/cantidad"));
                            }
                            else if(ruta == oModel.getProperty("/ruta") && cantidadYRuta.cantidad  == cuentaActual){
                                console.log("Se esta confirmando en ruta correcta,", " pero no se completo la cantidad de productos")
                                this.onOpenDialog("Esta tratando de ingresar un producto de mas", "Tiene que confirmar :"+oModel.getProperty("/cantidad") , " escaneando la ruta  : "+oModel.getProperty("/ruta"));
                            }                       
                            else{
                                console.log("Se esta confirmando en otra ruta");
                                this.onOpenDialog("Se esta confirmando en una ruta incorrecta . Se debe confirmar escaneando la ruta  "+oModel.getProperty("/ruta"));
                                
                            }
                        
                        } else {
                            // Si no se encuentra la ruta, manejar el caso adecuadamente
                            console.log("Escaneo un producto que no correspone.");
                            this.onOpenDialog("Escaneo un producto que no corresponde");
                        }
                        
                    }
                }
                else if ( cantidadYRuta.cantidad==-1){
                    this.onOpenDialog("Producto sobrante. Ya se asignaron todos los productos ", "en los destinos respectivos ");
                }
                else if ( cantidadYRuta.cantidad==-2){
                    this.onOpenDialog("Error al obtener la cantidad y la ruta", "El codigo no es un producto ni una confirmacion de ruta");
                }
                else if ( cantidadYRuta.cantidad==-3){
                    this.onOpenDialog("Se esta confirmando en una ruta incorrecta . Se debe confirmar escaneando la ruta  "+oModel.getProperty("/ruta"));
                }
                else if ( cantidadYRuta.cantidad==-4){
                    this.onOpenDialog("Antes de confirmar una ruta tiene ","que iniciar un ciclo de carga escaneando un producto");
                }
                
                
            } catch (error) {
                console.error("Error al obtener la cantidad y la ruta:", error);
               // this.onOpenDialog("Error");
               // cantidad.setText("Error al obtener la cantidad"); // Maneja el error estableciendo un texto de error en cantidad
               // ruta.setText("Error al obtener la ruta"); // Maneja el error estableciendo un texto de error en ruta
            }

            var oModel = this.getView().getModel();
            oModel.setProperty("/isArrowVisible", true);
            var descripcion = this.getView().byId("lDescripcion");
            MessageToast.show("Valor ingresado: " + sValue);

        },
        actualizarEstado: function (db, id, nuevoEstado) {
            var transaction = db.transaction(["ventilado"], "readwrite");
            var objectStore = transaction.objectStore("ventilado");
            
        
            // Obtener el registro por el valor del índice "id"
            // Crear el índice si no existe
  //  if (!objectStore.indexNames.contains("Id")) {
   //     objectStore.createIndex("Id", "Id", { unique: false });
   // }
    //var index = objectStore.index("Id");
   
            var getRequest = objectStore.get(id);
        
            getRequest.onsuccess = function(event) {
                var data = event.target.result;
                if (data) {
                    // Actualizar el campo 'Estado'
                    data.Estado = nuevoEstado;
        
                    // Guardar el registro actualizado
                    var updateRequest = objectStore.put(data);
        
                    updateRequest.onsuccess = function(event) {
                        console.log("El campo 'Estado' ha sido actualizado exitosamente.");
                        // Verificar que el campo 'Estado' ha sido actualizado correctamente
                var verifyRequest = objectStore.get(id);
                verifyRequest.onsuccess = function(event) {
                    var updatedData = event.target.result;
                    console.log("Valor actualizado del campo 'Estado':", updatedData.Estado);
                };
                verifyRequest.onerror = function(event) {
                    console.log("Error al verificar el campo 'Estado':", event.target.error);
                };
                    };
        
                    updateRequest.onerror = function(event) {
                        console.log("Error al actualizar el campo 'Estado':", event.target.error);
                    };
                } else {
                    console.log("No se encontró ningún registro con el Id proporcionado.");
                }
            };
        
            getRequest.onerror == function(event) {
                console.log("Error al buscar el registro:", event.target.error);
            };
            transaction.oncomplete = function() {
                console.log("Transacción completada.");
            };
        
            transaction.onerror = function(event) {
                console.log("Error en la transacción:", event.target.error);
            };
        },
        //   Aca se hacen los calculos para mostrar los numeros GRANDES de la pantalla
        obtenerCantidadYRuta: async function(eanInput) {
           
            try {
                var datos = await this.onGetData(eanInput); // Realiza una sola lectura de la tabla
                return { cantidad: datos.Cantidad, ruta: datos.Ruta, descripcion: datos.descripcion , id: datos.id}; // Devuelve un objeto con la cantidad y la ruta
            } catch (error) {
               // console.error("Error al obtener la cantidad y la ruta:", error);
                return { cantidad: -1, ruta: -1 , descripcion:""}; // o cualquier otro valor predeterminado si lo prefieres
            }
        },
//********* fin escaneo **************************/

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
            if (!this.byId("dialogoStop")) {
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
        //    var inputValue = stop.getValue();

            // Transferir el valor ingresado  a la logica

            this.byId("dialogoStop").close();            
    
        },
        // Método para manejar el evento afterClose del diálogo
        onStopDialogClose: function(oEvent) {
            // Limpiar el campo de entrada del diálogo
         //   var parcial = this.byId("stopInput");
          //  parcial.setValue("");
            // Devolver el foco al input del EAN
           // var eanInput = this.byId("eanInput");
           // eanInput.focus();
        },

/******  Llamada ejemplo al CRUD  ****************
        
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
*/

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


onGetData: function (key) {
    ctx = this;
    var result;
    var sKey = key;
    var flag = 0;
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
            var cursorRequest = index.openCursor(IDBKeyRange.only(sKey));
           
          //  var getRequest = index.get(key);

           // getRequest.onsuccess = function(event) {
            cursorRequest.onsuccess = function(event) {
               // var data = event.target.result;
               // if (data) {
               /* result = {
                    Cantidad: -1, 
                    Ruta: 0,
                    descripcion:"",
                    id : -1
                };*/
                var cursor = event.target.result;
                if (cursor) {
                    
                    var data = cursor.value;
                    if (data.Estado != "Completo") { // Reemplaza "CampoDeterminado" por el nombre del campo que necesitas verificar
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
                            result = {
                            Cantidad: cantidad, 
                            Ruta: ruta,
                            descripcion:descripcion,
                            id : id
                        };

                      resolve(result); // Resuelve la promesa con un objeto que contiene los valores de cantidad y Ruta
                    
                    } else {
                        // Continuar con el siguiente registro
                        flag=1;
                        cursor.continue();
                    }
                    
                } 
                else {
                    console.log("No se encontró Producto con el EAN proporcionado.");
                    // Busca para ver si es un Codigo de confirmacion
                    var ruta = ctx._findRouteByEAN(sKey);

                    if (ruta) {
                        // Si se encuentra la ruta, realizar las acciones necesarias
                        console.log("Ruta encontrada:", ruta);
                        // Ver si ya se completa la cantidad escaneada 
                        var oModel = ctx.getView().getModel();
                        if(ruta == oModel.getProperty("/ruta") && oModel.getProperty("/cuenta")==oModel.getProperty("/cantidad") ){
                            console.log("Confirmado");
                            // se competo el ciclo de escaneo  de un producto, resetear variables y confirmar log
                                result = {
                                Cantidad: oModel.getProperty("/cantidad"), 
                                Ruta: oModel.getProperty("/ruta"),
                                descripcion:oModel.getProperty("/descripcion"),
                                id : oModel.getProperty("/id")
                            };
        
                        }
                        else if(ruta == oModel.getProperty("/ruta") && oModel.getProperty("/cuenta")< oModel.getProperty("/cantidad") ){
                            console.log("falta escanear");
                            //  Abrir Fragment
                            result = {
                                Cantidad: oModel.getProperty("/cantidad"), 
                                Ruta: oModel.getProperty("/ruta"),
                                descripcion:oModel.getProperty("/descripcion"),
                                id : oModel.getProperty("/id")
                            };
        
                           // ctx.onOpenDialog("Falta agregar productos Scan = "+oModel.getProperty("/cuenta") , "el total debe ser:"+oModel.getProperty("/cantidad"));
                        }
                        
                        else if(ruta != oModel.getProperty("/ruta") ){   
                            if (ruta !=0 && oModel.getProperty("/cantidad")>0) {                                                    
                                console.log("Confirmacion en otra ruta");
                                //  Abrir Fragment
                                result = {
                                    Cantidad: -3, 
                                    Ruta: oModel.getProperty("/ruta"),
                                    descripcion:oModel.getProperty("/descripcion"),
                                    id : oModel.getProperty("/id")
                                };
                            }
                            else if (ruta != 0 && oModel.getProperty("/cantidad")==0){
                                console.log("Antes de confirmar una ruta tiene ","que iniciar un ciclo de carga escaneando un producto")
                                result = {
                                    Cantidad: -4, 
                                    Ruta: 0,
                                    descripcion:"",
                                    id : 0
                                };
                            }
            
                           // ctx.onOpenDialog("Error en la ruta de destino: "+ ruta , "debe confirmarse en ruta :"+oModel.getProperty("/ruta"));
                            
                        }
                        
                       
                    } else {
                        // Si no se encuentra la ruta, manejar el caso adecuadamente
                        console.log("No es un producto ni un codigo de confirmacion");
                        // abrir un fragment
                        if (flag==1)
                            result = {
                                Cantidad: -1, 
                                Ruta: 0,
                                descripcion:"",
                                id : 0
                            };
                        else{
                            result = {
                                Cantidad: -2, 
                                Ruta: 0,
                                descripcion:"",
                                id : 0
                            };
                        }
    
                        // ctx.onOpenDialog("Error : No es un producto ni un codigo de confirmacion");

                    }
                    resolve(result);
                }
                
            };

            cursorRequest.onerror = function(event) {
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



 //***** Método para abrir el diálogo en caso de errores *************/
 onOpenDialog: function(msg1, msg2, msg3) {
           
    //Cargamos el Dialogo
     var oView = this.getView();            
     if (!this.byId("codeDialog")) {
      // load asynchronous XML fragment
      Fragment.load({
       id: oView.getId(),
       name: "ventilado.ventilado.view.CodeDialog",// todo el camino incluido el nombre del XML
       controller: this
     }).then(function (oDialog) {
     // connect dialog to the root view 
     //of this component (models, lifecycle)
         oView.addDependent(oDialog);
         oDialog.open();
        // Accedemos a los labels dentro del VBox
        var aContent = oDialog.getContent()[0].getItems(); // Asumimos que VBox es el primer y único contenido del diálogo

        if (aContent && aContent.length >= 3) {
            aContent[0].setText(msg1); // Primer Label
            aContent[1].setText(msg2); // Segundo Label
            aContent[2].setText(msg3); // Tercer Label
        } 
         
        });
      } else {
            var oDialog =this.byId("codeDialog");
           
            // Accedemos a los labels dentro del VBox
            var aContent = oDialog.getContent()[0].getItems(); // Asumimos que VBox es el primer y único contenido del diálogo

            if (aContent && aContent.length >= 3) {
                aContent[0].setText(msg1); // Primer Label
                aContent[1].setText(msg2); // Segundo Label
                aContent[2].setText(msg3); // Tercer Label
            } 
            oDialog.open();
         
        }
 },
      
 // Método para manejar la confirmación del valor ingresado en el diálogo del código interno
 onCodeConfirm: async function() {
     this.byId("codeDialog").close();
 },

 // Método para manejar el evento afterClose del diálogo
 onCodeInputDialogClose: function(oEvent) {
      
         // Devolver el foco al input del EAN
         var eanInput = this.byId("eanInput");
         eanInput.focus();
     
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