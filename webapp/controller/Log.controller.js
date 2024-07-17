sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",

    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",

], function (Controller, MessageToast, JSONModel,ODataModel,Filter,FilterOperator,MessageBox) {
    "use strict";
    var ctx= this;  // Variable eglobal en el controlador para guardar el contexto
    var sTransporte;
    var sPuesto ;
    var sReparto ;
    var sPtoPlanif ;
    var sUsuario;
    var sFecha; 
    return Controller.extend("ventilado.ventilado.controller.Log", {
         
        onInit: function () {
            sPuesto = sessionStorage.getItem("puesto") || "";
            sReparto = sessionStorage.getItem("reparto") || "";
            sPtoPlanif = sessionStorage.getItem("pto_planif") || "";
            sUsuario = sessionStorage.getItem("usuario") || "";
            sFecha = sessionStorage.getItem("fecha") || new Date().toISOString().slice(0, 10);
     
          /*  this._checkNetworkStatus();  // funcion para que el navegador controle la conexion a internet
            this._fetchCodConfirmacionData(); // Llamar a la función para leer los Codigos de confirmacion de ruta del backend                  
     
            var oModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oModel);
            this.obtenerYProcesarDatos();*/
            var datos = [
                { 
                    Id: 1,
                    CodInterno: "Cod001",
                    Descripcion: "Producto A",
                    CantidadEscaneada: 10,
                    Ruta: "01",
                    Transporte: 1060,
                    Entrega: 800601
                },
                { 
                    Id: 2,
                    CodInterno: "Cod001",
                    Descripcion: "Producto A",
                    CantidadEscaneada: 15,
                    Ruta: "02",
                    Transporte: 1060,
                    Entrega: 800602
                },
                { 
                    Id: 3,
                    CodInterno: "Cod001",
                    Descripcion: "Producto A",
                    CantidadEscaneada: 8,
                    Ruta: "03",
                    Transporte: 1060,
                    Entrega: 800603
                },
                { 
                    Id: 4,
                    CodInterno: "Cod002",
                    Descripcion: "Producto B",
                    CantidadEscaneada: 12,
                    Ruta: "01",
                    Transporte: 1060,
                    Entrega: 800601
                },
                { 
                    Id: 5,
                    CodInterno: "Cod002",
                    Descripcion: "Producto B",
                    CantidadEscaneada: 18,
                    Ruta: "02",
                    Transporte: 1060,
                    Entrega: 800602
                },
                { 
                    Id: 6,
                    CodInterno: "Cod002",
                    Descripcion: "Producto B",
                    CantidadEscaneada: 7,
                    Ruta: "03",
                    Transporte: 1060,
                    Entrega: 800603
                },
                // Puedes seguir agregando más objetos según sea necesario
            ];
            
            // Objeto para almacenar los datos agrupados por código interno y descripción
            var datosAgrupados = {};
            // Objeto para almacenar los totales por ruta
            var totalesPorRuta = {};
            // Iterar sobre los datos y agrupar por código interno y descripción
            datos.forEach(function(item) {
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
           // Crear un nuevo modelo JSON
    /*        var oModel = new JSONModel();
           oModel.setData({ tableData: arrayDatosAgrupados });

           // Asignar el modelo a la vista
           this.getView().setModel(oModel);*/
           // Convertir el objeto de totales por ruta en un array
var arrayTotalesPorRuta = [];
for (var ruta in totalesPorRuta) {
    arrayTotalesPorRuta.push({ Ruta: ruta, CantidadTotal: totalesPorRuta[ruta].CantidadTotal, Entrega: totalesPorRuta[ruta].Entrega });
}

// Crear un nuevo modelo JSON con ambos arrays
var oModel = new sap.ui.model.json.JSONModel();
oModel.setData({
    tableData: arrayDatosAgrupados,
    totalesPorRuta: arrayTotalesPorRuta
});

// Asignar el modelo a la vista
this.getView().setModel(oModel);

        },
                     


    });

});