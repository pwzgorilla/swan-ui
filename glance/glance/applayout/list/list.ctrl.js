(function () {
    'use strict';
    angular.module('glance.layout')
        .controller('LayoutListCtrl', LayoutListCtrl);


    /* @ngInject */
    function LayoutListCtrl($rootScope, $scope, data, layoutBackend, utils, clusters, layoutCurd, appservice) {
        var self = this;
        var events = undefined;

        self.clusterNameMap = listClusterMap(clusters);
        self.stacks = data.Stacks;
        self.stackTypeText = STACK_STATUS;
        self.APP_STATUS = APP_STATUS;
        self.openFlag = {};
        self.appList = {};

        self.showTableData = showTableData;
        self.delStack = delStack;
        self.stopApp = stopApp;
        self.startApp = startApp;
        self.deleteApp = deleteApp;
        self.undoApp = undoApp;
        self.updateContainer = updateContainer;

        activate();

        $scope.$on('$destroy', function() {
            if(events) {
                events.close();
                events = undefined;
            }
        });

        function activate() {
            Stream(function (data) {
                for(var i=0; i < self.stacks.length; i++) {
                    var value = self.stacks[i];
                    if(value.Id === data.stackId && value.md5 !== data.md5) {
                        value.status = data.status;
                        value.md5 = data.md5;
                        value.deploymentMessage = data.deploymentMessage;
                        $scope.$digest();
                        break;
                    }
                }
            });
        }

        function Stream(_callback) {
            var callback = _callback;
            var url = utils.buildFullURL("stack.sse")
                + '?authorization=' + $rootScope.token;

            events = new EventSource(url);
            events.addEventListener("deployment_process", function(event) {
                if (callback !== undefined) {
                    callback(JSON.parse(event.data));
                }
            });
            events.onerror = function (event) {
                callback = undefined;
                if (events !== undefined) {
                    events.close();
                    events = undefined;
                }
                console.log('applayout event stream closed due to error.', event);
            };
        }

        function showTableData(clusterId, stackId) {
            if (!self.openFlag[stackId]) {
                layoutBackend.getStack(clusterId, stackId).then(function (data) {
                    self.appList[stackId] = data.applications;
                    appservice.listAppsStatus()
                        .then(function (data) {
                            self.appListStatus = data;
                        });
                    self.openFlag[stackId] = true;
                })
            } else {
                self.openFlag[stackId] = false;
                self.appList[stackId] = [];
                self.appListStatus = {}
            }
        }

        function delStack(clusterId, stackId, ev) {
            layoutCurd.deleteStack(clusterId, stackId, ev)
                .then(function (data) {
                    self.stacks = data.Stacks
                })
        }

        function stopApp(clusterId, appId, stackId) {
            var data = {};
            layoutCurd.stopApp(data, clusterId, appId, stackId)
                .then(function (data) {
                    self.appList[stackId] = data.applications;
                })
        }

        function startApp(clusterId, appId, stackId) {
            var data = {};
            layoutCurd.startApp(data, clusterId, appId, stackId)
                .then(function (data) {
                    self.appList[stackId] = data.applications;
                })
        }

        function deleteApp(clusterId, appId, stackId, ev) {
            layoutCurd.deleteApp(clusterId, appId, stackId, ev)
                .then(function (data) {
                    self.appList[stackId] = data.applications;
                })
        }

        function undoApp(clusterId, appId, stackId) {
            var data = {};
            layoutCurd.undoApp(data, clusterId, appId, stackId)
                .then(function (data) {
                    self.appList[stackId] = data.applications;
                })
        }

        function updateContainer(curInsNmu, clusterId, appId, stackId, ev) {
            layoutCurd.updateContainer(curInsNmu, clusterId, appId, stackId, ev)
                .then(function (data) {
                    self.appList[stackId] = data.applications;
                })
        }

        /*
         获取集群名
         */
        function listClusterMap(clusters) {
            var clusterNameMap = {};
            angular.forEach(clusters, function (cluster) {
                clusterNameMap[cluster.id] = cluster.name;
            });
            return clusterNameMap
        }

        ///
    }
})();