sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/PDFViewer",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",

], function (Controller, MessageToast, PDFViewer,Fragment,JSONModel,ODataModel,Filter,FilterOperator,MessageBox) {
    "use strict";
    var ctx= this;  // Variable eglobal en el controlador para guardar el contexto
    var sTransporte;
    var sPuesto ;
    var sReparto ;
    var sPtoPlanif ;
    var sUsuario;
    var sFecha; 
    return Controller.extend("ventilado.ventilado.controller.Scan2", {
         
        onInit: function () {
            sPuesto = sessionStorage.getItem("puesto") || "";
            sReparto = sessionStorage.getItem("reparto") || "";
            sPtoPlanif = sessionStorage.getItem("pto_planif") || "";
            sUsuario = sessionStorage.getItem("usuario") || "";
            sFecha = sessionStorage.getItem("fecha") || new Date().toISOString().slice(0, 10);
     
            this._checkNetworkStatus();  // funcion para que el navegador controle la conexion a internet
            this._fetchCodConfirmacionData(); // Llamar a la función para leer los Codigos de confirmacion de ruta del backend                  
     
            var oModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oModel);
            this.obtenerYProcesarDatos();
            
        },
  

});

});