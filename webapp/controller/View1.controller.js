sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/PDFViewer",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel"

], function (UIComponent,Controller, MessageToast, PDFViewer,Fragment,JSONModel,ODataModel) {
    "use strict";
    var ctx;
    return Controller.extend("ventilado.ventilado.controller.View1", {
        onInit: function () {
        var oDate = new Date();
        var oFormattedDate = this._formatDate(oDate);
        var oModel = new JSONModel({
            date: oFormattedDate
        });
       
// Crear el modelo global
/*var oGlobalModel = new JSONModel({
// Asignar datos al modelo global

    reparto: "",
    operador: "",
    fecha: oFormattedDate,
    cantidad: ""
});
// Establecer el modelo global en el componente
this.setModel(oGlobalModel, "global");*/
// Llamar al método init de la clase base
this.getView().setModel(oModel, "viewModel");
//UIComponent.prototype.init.apply(this, arguments);



    },
    
        _formatDate: function (date) {
            var day = String(date.getDate()).padStart(2, '0');
            var month = String(date.getMonth() + 1).padStart(2, '0'); // Enero es 0
            var year = date.getFullYear();
            return day + '/' + month + '/' + year;
        },
         
        onLoginPress: function () {
          //  var oAuthModel = this.getOwnerComponent().getModel("auth");
          //  var sUsername = this.byId("username").getValue();
          //  var sPassword = this.byId("password").getValue();

            // Simulación de autenticación. Reemplazar con lógica real de autenticación.
          //  if (sUsername === "admin" && sPassword === "password") {
            //   oAuthModel.setProperty("/isLoggedIn", true);
               //sap.ui.core.UIComponent.getRouterFor(this).navTo("Scan");
               const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
               oRouter.navTo("Scan");
         //   } else {
         //       sap.m.MessageToast.show("Algo esta mal !!");
         //   }
        }
    });
});