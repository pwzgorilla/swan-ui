/**
 * Created by my9074 on 16/3/2.
 */
(function () {
    'use strict';
    angular.module('glance.utils')
        .factory('formModal', formModal);

    /* @ngInject */
    function formModal($uibModal) {
        
        return {
            open: open
        };

        //options: size,dataName,initData,initDataName,ctrlName
        function open(templateUrl, options) {
            if (!options) {
                options = {};
            }
            if (!options.dataName) {
                options.dataName = 'form';
            }
            if (!options.initDataName) {
                options.initDataName = options.dataName;
            }
            if (!options.ctrlName) {
                options.ctrlName = 'formCtrl';
            }
            var modalInstance = $uibModal.open({
                templateUrl: templateUrl,
                controller: FormModalCtrl,
                controllerAs: options.ctrlName,
                size: options.size,
                resolve: {
                    dataName: function () {
                        return options.dataName
                    },
                    initData: function () {
                        return options.initData
                    },
                    initDataName: function () {
                        return options.initDataName
                    }
                }
            })
            
            return modalInstance.result;
        }
        
        /* @ngInject */
        function FormModalCtrl($uibModalInstance, dataName, initData, initDataName) {
            var self = this;
            self[initDataName] = initData;
            
            self.ok = function () {
                $uibModalInstance.close(self[dataName]);
            };
            
            self.cancel = function () {
                $uibModalInstance.dismiss('cancel');
            };
        
        }
    }
})();