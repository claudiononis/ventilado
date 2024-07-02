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
    return Controller.extend("ventilado.ventilado.controller.Scan2", {
         
        onInit: function () {
          //  window.onbeforeunload = function() {
          //      return "¿Estás seguro de que deseas salir de esta página?";
          //  };
           // this._initDatabase();
            this._checkNetworkStatus();  // funcion para que el navegador controle la conexion a internet
            this._fetchCodConfirmacionData(); // Llamar a la función para leer los Codigos de confirmacion de ruta del backend                  
     
            var oModel = new sap.ui.model.json.JSONModel();
    this.getView().setModel(oModel);
    this.obtenerYProcesarDatos();
            
        },

/****** Inicio: Obtiene los datos de la Base local agrupa x Ruta y arma  la tabla de avance  */
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
                        nuevoRegistro[column] = registro[column] || "0";
                    });
                    return nuevoRegistro;
                });
        
                // Actualizar el modelo con tableDataArray
                var oGlobalModel = this.getOwnerComponent().getModel("globalModel");
                var oModel = this.getView().getModel(); // Obtener el modelo de la vista
                oModel.setData({
                    isStarted: false,
                    isArrowVisible: false,
                    tableData: tableDataArray,
                    puesto: "Estación de trabajo Nro: " + oGlobalModel.getData().puesto,
                    transporte: "Reparto: " + oGlobalModel.getData().reparto,
                    cuenta: 0,
                    cantidad: 0,
                    ruta: 0,
                    ean: "",
                    eanRuta: "",
                    id: 0
                });
                this.getView().setModel(oModel);
        
                console.log(tableDataArray);
            } catch (error) {
                console.log("Error:", error);
            }
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

        procesarDatos: function(datos) {
            let resultado = {};            
            datos.forEach((registro) => {
                let ruta = registro.LugarPDisp;
                let cantidad = registro.CantidadEntrega; 
                let sCantEscaneada = registro.CantEscaneada;           
                if (!resultado[ruta]) {
                    // Inicializa el objeto de la ruta si no existe
                    resultado[ruta] = {
                        "Ruta": ruta,
                        "TOT": 0,
                        "SCAN": 0, 
                        "FALTA": 0, 
                        "Cub TEO": 0, 
                        "C Real": 0, 
                        "Pa": 0, 
                      //  fecha: registro.fecha,  //Suponiendo que la fecha es la misma para todos los registros de la misma ruta
                      //  transportista: registro.transportista  // Suponiendo que el transportista es el mismo para todos los registros de la misma ruta
                    };
                }

                // Suma la cantidad al total
                resultado[ruta]["TOT"] += cantidad;                
                resultado[ruta]["SCAN"] += Number(sCantEscaneada);
                resultado[ruta]["FALTA"] =  resultado[ruta]["TOT"] -  resultado[ruta]["SCAN"];
                // Aquí deberías agregar lógica para calcular SCAN, FALTA, Cub TEO, C Real, Pa
            });
            
            // Convierte el objeto resultado en un array
            let arrayResultado = Object.keys(resultado).map((ruta) => resultado[ruta]);
            
            return arrayResultado;
        },
/****** Fin: Obtiene los datos de la Base local agrupa x Ruta y arma  la tabla de avance  */        


/***** Inicio : Rutinas que se activan cuando se competan la cantidad de cubetas reales   */
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
/** Fin : Rutinas que se activan cuando se competan la cantidad de cubetas reales  ********/

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

/****** Inicio: Arranca proceso de  escaneo  *****************************************  ***/

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
           var cantidadYRuta;
           if (oModel.getProperty("/ruta")==0){
                // Entra un codigo y el modelo esta vacio
                try {
                    /** vemos si el EAN es un producto */ 
                    cantidadYRuta = await this.obtenerCantidadYRuta(sValue,1);                
                    if (cantidadYRuta.cantidad > 0 ){
                        console.log("es un producto");
                        // Actualiza el modelo
                        oModel.setProperty("/ruta", cantidadYRuta.ruta);
                        oModel.setProperty("/cantidad", cantidadYRuta.cantidad);               
                        oModel.setProperty("/ean", sValue);
                        oModel.setProperty("/id", cantidadYRuta.id);
                         // Actualiza la pantalla
                        cantidad.setText(cantidadYRuta.cantidad);
                        sRuta.setText(cantidadYRuta.ruta);
                        descripcion.setText(cantidadYRuta.descripcion);
                        Ean.setValue(cantidadYRuta.ean);
                        ci.setText(cantidadYRuta.ci);
                    }
                    else {
                        cantidadYRuta = await this.obtenerCantidadYRuta(sValue,2); // no es unproducto verifica si es un CI
                        if (cantidadYRuta.cantidad > 0 ){
                            // Actualiza el modelo
                            console.log("es un ci");
                            oModel.setProperty("/ruta", cantidadYRuta.ruta);
                            oModel.setProperty("/cantidad", cantidadYRuta.cantidad);               
                            oModel.setProperty("/ean", cantidadYRuta.ean);
                            oModel.setProperty("/id", cantidadYRuta.id);
                            oModel.setProperty("/ci", cantidadYRuta.ci);
                            // Actualiza la pantalla
                            cantidad.setText(cantidadYRuta.cantidad);
                            sRuta.setText(cantidadYRuta.ruta);
                            descripcion.setText(cantidadYRuta.descripcion);
                            Ean.setValue(cantidadYRuta.ean);
                            ci.setText(cantidadYRuta.ci);
                        }
                        else{ // no es ni producto ni CI, comprobar si es un codigo de confirmacion                           
                            if(cantidadYRuta.cantidad==-2){
                                console.log(" Error: Producto sobrante");
                                this.onOpenDialog(" Error : Producto sobrante");
                            }
                            else if (cantidadYRuta.cantidad==-1){
                                console.log(" Error no se conoce el valor ingresado");
                                this.onOpenDialog(" Error : Error no se conoce el valor ingresado");
                            }                            
                        }

                    }
                } catch (error) {
                    console.error("Error al obtener la cantidad y la ruta:", error);               
                }
            }
            else{// entro un codigo y el modelo no esta vacio, tiene que entrar un codigo de confirmacion
                var ruta = this._findRouteByEAN(sValue);
                if (ruta){
                    console.log("es una confirmacion")
                    // es la confirmacion al ciclo actual
                    // resetea valores para iniciar el nuevo ciclo  
                    var scant= oModel.getProperty("/cantidad");
                    if (ruta ==oModel.getProperty("/ruta"))  {                   
                        oModel.setProperty("/ruta", 0);                         
                        oModel.setProperty("/cantidad", 0);                               
                        oModel.setProperty("/ean", "");
                        oModel.setProperty("/ci", "");
                        oModel.setProperty("/descripcion", "");
                        //actualiza el estado 
                        var request = indexedDB.open("ventilado", 2);  
                        var id=  oModel.getProperty("/id");                         
                        request.onsuccess = function(event) {
                            var db = event.target.result;
                            // Llamar a la función para actualizar el campo 'Estado'
                            ctx.actualizarEstado(db, id, "Completo",scant);
                        };
                        oModel.setProperty("/id", 0);                               
                        cantidad.setText("");
                        sRuta.setText("");
                        descripcion.setText("");
                        Ean.setValue("");
                        ci.setText(""); 
                        // Actualizar tableData
                       var tableData = oModel.getProperty("/tableData");
                       // Buscar el registro correspondiente en tableData
                       tableData.forEach(function (registro) {
                           if (registro.Ruta === ruta) {                        
                            registro.SCAN = Number(registro.SCAN) || 0;
                               registro.SCAN += Number(scant);
                               registro.FALTA = registro.FALTA - Number(scant);
                           }
                       });
                        // Establecer el array actualizado en el modelo
                       oModel.setProperty("/tableData", tableData);
                    }
                    else{
                        this.onOpenDialog(" Error : esta confirmando en la ruta equivocada","tiene que hacelo en la ruta"+ oModel.getProperty("/ruta"));
                    } 
                }
                else{                   
                    this.onOpenDialog(" Error : tiene que ingresar un codigo de confirmacion de ruta");                    
                }
            }
            var oModel = this.getView().getModel();
            oModel.setProperty("/isArrowVisible", true);
            var descripcion = this.getView().byId("lDescripcion");
            MessageToast.show("Valor ingresado: " + sValue);
 
        },  
              
    
       /***    /** Encuentra la ruta a partir del EAN  */
       _findRouteByEAN: function(ean) {
        var oLocalModel = this.getView().getModel();
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

    /** Lee del backend los codigos EAN de las rutas y los pasa a un array local */
    _fetchCodConfirmacionData: function() {
        var oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/");
        
        oModel.read("/CodConfirmacionSet", {
            success: function (oData) {
               // var oLocalModel = this.getView().getModel("localModel");
                var oLocalModel = this.getView().getModel();
                // Verificar si oData.results es un array
                if (Array.isArray(oData.results)) {
                    // Si es un array, guardar todos los items en el modelo local
                    oLocalModel.setProperty("/codConfirmacionData", oData.results);// guarda los codigos en el modelo local
                } else {
                    // Si no es un array, manejar el único item directamente
                    var item = oData.results;
                    oLocalModel.setProperty("/codConfirmacionData", [item]);// guarda los codigos en el modelo local
                }
                console.log("Datos copiados con éxito.");
            }.bind(this),
            error: function (oError) {
                console.error("Error al leer datos del servicio OData:", oError);
            }
        });
    },

        actualizarEstado: function (db, id, nuevoEstado, cant) {
            ctx=this;
            var transaction = db.transaction(["ventilado"], "readwrite");
            var objectStore = transaction.objectStore("ventilado");
   
            var getRequest = objectStore.get(id);// consulta la base x el registro que tiene el id pasado
        
            getRequest.onsuccess = function(event) {
                var data = event.target.result;// recupera el registro
                if (data) {
                    // Actualizar el campo 'Estado'
                    data.Estado = nuevoEstado;   
                    data.CantEscaneada = cant;    
                    // Guardar el registro actualizado
                    var updateRequest = objectStore.put(data);        
                    updateRequest.onsuccess = function(event) { // si se guardo satisfactoriamente vengox aca
                        console.log("El campo 'Estado' ha sido actualizado exitosamente.");
                        // Verificar que el campo 'Estado' ha sido actualizado correctamente
                        var verifyRequest = objectStore.get(id);
                        verifyRequest.onsuccess = function(event) {
                            var updatedData = event.target.result;
                            console.log("Valor actualizado del campo 'Estado':", updatedData.Estado);
                            ctx.oActualizarBackEnd(id, nuevoEstado, cant );
                        };
                        verifyRequest.onerror = function(event) { // si hay un error al guardar el dato , voy x aca
                            console.log("Error al verificar el campo 'Estado':", event.target.error);
                        };
                    };
        
                    updateRequest.onerror = function(event) {// si hay error al recuperar el registro voy x aca
                        console.log("Error al actualizar el campo 'Estado':", event.target.error);
                    };
                } else {// si no se encuentra el registro voy x aca
                    console.log("No se encontró ningún registro con el Id proporcionado.");
                }
            };
        
           
        },
        oActualizarBackEnd:function(id, estado, cantidad ){
            var updatedData =[{ "Id": id, "Estado": estado, "CantEscaneada": cantidad }] ;
            this.crud("ACTUALIZAR", "ventilado",id, updatedData, "");

        },

        //   Aca se hacen los calculos para mostrar los numeros GRANDES de la pantalla
        obtenerCantidadYRuta: async function(eanInput, busqueda) {
           
            try {
                var datos = await this.onGetData(eanInput , busqueda ); // Realiza una sola lectura de la tabla
                return { cantidad: datos.Cantidad, ruta: datos.Ruta, descripcion: datos.descripcion , id: datos.id, ean: datos.ean, ci: datos.ci}; // Devuelve un objeto con la cantidad y la ruta
            } catch (error) {
               // console.error("Error al obtener la cantidad y la ruta:", error);
                return { cantidad: -3, ruta: -1 , descripcion:""}; // o cualquier otro valor predeterminado si lo prefieres
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

//*******  Inicio  Funciones para el CRUD del oData *******/  
        crud: function(operacion , tabla,id, oValor1, oValor2 ){
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
                    var sPath = sEntitySet+"(" + oEntry.Id + ")";  // Ajusta esta ruta según tu modelo OData
                    oModel.update(sPath, oEntry, {
                        success: function () {
                            MessageToast.show("Registro " + oEntry.Id + " actualizado con éxito.");
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
/*_initDatabase: function () {
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
    


        console.log("Almacén de objetos creado con ,:éxito.");
    };

    request.onsuccess = function (event) {
        this.db = event.target.result;
        console.log("Base de datos abierta con éxito.");
        this._fetchAndStoreOData(); //Luego de abrir la base se guardan los datos
    }.bind(this);
},*/

_fetchAndStoreOData: function () {
    var oModel = new ODataModel("/sap/opu/odata/sap/ZVENTILADO_SRV/");
    //Se leen los datos del backend y se guardan en la base local
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


onGetData: function (key,busqueda) { // busqueda =1 busca si es un producto 
                                     // busqueda =2 busca si es un codigo interno
    ctx = this;
    var result;
    var sKey = key;
    var flag = 0;
    return new Promise(function(resolve, reject) {
        var index;
        var request = indexedDB.open("ventilado", 2); // Asegúrate de usar la misma versión

        request.onsuccess = function(event) {
            var db = event.target.result;
            var transaction = db.transaction(["ventilado"], "readonly");
            var objectStore = transaction.objectStore("ventilado");
            if (busqueda == 1){
                // Verificar si el índice "Ean" existe          
                    if (!objectStore.indexNames.contains("Ean")) {
                        console.error("El índice 'Ean' no se encontró.");
                        return;
                    }
                    index = objectStore.index("Ean");
            }
            else{
                // Verificar si el índice "Codigo_interno" existe          
                if (!objectStore.indexNames.contains("Codigo_interno")) {
                    console.error("El índice 'Codigo_interno' no se encontró.");
                    return;
                }
                index = objectStore.index("Codigo_interno");
            }           
            var cursorRequest = index.openCursor(IDBKeyRange.only(sKey));           
            cursorRequest.onsuccess = function(event) {           
                var cursor = event.target.result;
                if (cursor) {
                    
                    var data = cursor.value;
                    if (data.Estado != "Completo") { // busca una linea que no este procesada
                        console.log("Registro encontrado:", data);
                        // Aquí se puede manejar el registro encontrado
                        // Accediendo a cada campo del registro
                        var id = data.Id;
                        var descripcion = data.Descricion;
                        var cantidad = data.CantidadEntrega;//aca va la cantidad
                        var ean = data.Ean;
                        var ci = data.CodigoInterno;
                        var ruta = data.LugarPDisp;// esta es la ruta
                            result = {
                            Cantidad: cantidad, 
                            Ruta: ruta,
                            descripcion:descripcion,
                            id : id,
                            ean: ean,
                            ci:  ci
                        };
                        flag=2;
                       
                      resolve(result); // Resuelve la promesa con un objeto que contiene los valores de cantidad y Ruta
                    
                    } else {
                        // Continuar con el siguiente registro
                        flag=1;
                        cursor.continue();
                        return;
                    }   
                } 
                if (flag<2){
                    if (flag==1 && (busqueda==1 || busqueda==2)){
                        // console.log("Es un producto pero sobra");                    
                            result = {
                                Cantidad: -2, 
                                Ruta: 0,
                                descripcion:"",
                                id :0
                            };
                            resolve(result); 
                    }
                    else if (flag==0 && busqueda==1 ){
                        // console.log("No Es un producto ");
                            result = {
                                Cantidad: -1, 
                                Ruta: 0,
                                descripcion:"",
                                id :0

                            };
                            resolve(result); 
                    }
                    else if (flag==0 && busqueda==2 ){
                        // console.log("No Es un producto ");
                            result = {
                                Cantidad: -1, 
                                Ruta: 0,
                                descripcion:"",
                                id :0
                            };
                            resolve(result); 
                        }
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

/*
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
*/


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
},
/********* Función general para manejar operaciones CRUD de la BD Local y devolver una promesa *****/
manejarCRUD: function (operacion, datos, campoBusqueda = "id") {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("miBaseDeDatos", 1);
  
      request.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("miObjectStore")) {
          const objectStore = db.createObjectStore("miObjectStore", { keyPath: "id" });
          objectStore.createIndex("nombre", "nombre", { unique: false });
        }
      };
  
      request.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(["miObjectStore"], "readwrite");
        const objectStore = transaction.objectStore("miObjectStore");
        let req;
  
        switch (operacion) {
          case "crear":
            req = objectStore.add(datos);
            break;
  
          case "leer":
            req = campoBusqueda === "id" ? objectStore.get(datos.id) : objectStore.index(campoBusqueda).get(datos[campoBusqueda]);
            break;
  
          case "actualizar":
            if (campoBusqueda === "id") {
              req = objectStore.put(datos);
            } else {
              const getReq = objectStore.index(campoBusqueda).get(datos[campoBusqueda]);
              getReq.onsuccess = function(event) {
                const item = event.target.result;
                if (item) {
                  Object.assign(item, datos);
                  const updateReq = objectStore.put(item);
                  updateReq.onsuccess = () => resolve(updateReq.result);
                  updateReq.onerror = (event) => reject(new Error(`Error en la operación ${operacion}: ${event.target.error}`));
                } else {
                  reject(new Error("Elemento no encontrado para actualizar"));
                }
              };
              getReq.onerror = (event) => reject(new Error(`Error al buscar para actualizar: ${event.target.error}`));
              return;
            }
            break;
  
          case "eliminar":
            if (campoBusqueda === "id") {
              req = objectStore.delete(datos.id);
            } else {
              const getReq = objectStore.index(campoBusqueda).getKey(datos[campoBusqueda]);
              getReq.onsuccess = function(event) {
                const key = event.target.result;
                if (key !== undefined) {
                  const deleteReq = objectStore.delete(key);
                  deleteReq.onsuccess = () => resolve(deleteReq.result);
                  deleteReq.onerror = (event) => reject(new Error(`Error en la operación ${operacion}: ${event.target.error}`));
                } else {
                  reject(new Error("Elemento no encontrado para eliminar"));
                }
              };
              getReq.onerror = (event) => reject(new Error(`Error al buscar para eliminar: ${event.target.error}`));
              return;
            }
            break;
  
          default:
            reject(new Error("Operación no válida"));
            return;
        }
  
        req.onsuccess = function() {
          resolve(req.result);
        };
  
        req.onerror = function(event) {
          reject(new Error(`Error en la operación ${operacion}: ${event.target.error}`));
        };
      };
  
      request.onerror = function(event) {
        reject(new Error(`Error al abrir la base de datos: ${event.target.error}`));
      };
    });
  },
  
  // Ejemplo de funciones para operaciones CRUD
  crearElemento:async function (datos) {
    try {
      const resultado = await manejarCRUD("crear", datos);
      console.log("Elemento creado con éxito:", resultado);
    } catch (error) {
      console.error("Error al crear el elemento:", error);
    }
  },
  
  leerElemento:async function (campoBusqueda, valorBusqueda) {
    try {
      const resultado = await manejarCRUD("leer", { [campoBusqueda]: valorBusqueda }, campoBusqueda);
      console.log("Elemento leído:", resultado);
    } catch (error) {
      console.error("Error al leer el elemento:", error);
    }
  },
  
  actualizarElemento:async function (campoBusqueda, valorBusqueda, nuevosDatos) {
    try {
      const elemento = await manejarCRUD("leer", { [campoBusqueda]: valorBusqueda }, campoBusqueda);
      if (elemento) {
        Object.assign(elemento, nuevosDatos);
        await manejarCRUD("actualizar", elemento);
        console.log("Elemento actualizado con éxito");
      } else {
        console.log("Elemento no encontrado");
      }
    } catch (error) {
      console.error("Error al actualizar el elemento:", error);
    }
  },
  
  eliminarElemento:async function (campoBusqueda, valorBusqueda) {
    try {
      await manejarCRUD("eliminar", { [campoBusqueda]: valorBusqueda }, campoBusqueda);
      console.log("Elemento eliminado con éxito");
    } catch (error) {
      console.error("Error al eliminar el elemento:", error);
    }
  },
 /* 
  // Ejemplos de uso
  crearElemento({ id: 1, nombre: "Elemento1" });
  leerElemento("id", 1);
  actualizarElemento("nombre", "Elemento1", { nombre: "Elemento1Modificado" });
  eliminarElemento("nombre", "Elemento1Modificado");*/
  
  

});

});