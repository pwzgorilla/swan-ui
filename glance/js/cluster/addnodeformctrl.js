function addNodeFormCtrl($rootScope, $scope, $state, $stateParams, glanceHttp, Notification, labelService) {
    
    $scope.clusterId = $stateParams.clusterId;
    $scope.nodeId = $stateParams.nodeId;

    $scope.selectedLabels = [];
    $scope.unselectedLabels = [];

    $scope.isConected = false;

    $scope.form = {
      attributes: {
        'gateway': false,
        'proxy': false,
      },
      id: $scope.nodeId,
      labels: []
    };

    $scope.attribute = 'noAttribute';
  
    $scope.msgstate = "等待主机链接......";

    $scope.message_error_info = {};
    $scope.$on(SUB_INFOTYPE.nodeStatus, function (event, data) {
      if(data['nodeId'] == $scope.nodeId && data['status'] != 'terminated') {
        $scope.isConected = true;
        $scope.msgstate = '主机连接成功，系统初始化中，这可能需要一段时间，您可以离开本页面去执行其他操作。';
      }
    });
    $scope.addNode = function(isCon) {
        if (isCon) {
            $state.go('cluster.nodesource', {
                'clusterId':$stateParams.clusterId
            });
        } else {
            $state.go('cluster.clusterdetails.nodes', {
                'clusterId':$stateParams.clusterId
            });
        }
    };
    var cmdArray = new Array(
        'sudo -H',
        AGENT_CONFIG.dmHost,
        'OMEGA_ENV=' + RUNNING_ENV,
        'bash -c \'$(curl -Ls https://raw.githubusercontent.com/Dataman-Cloud/agent-installer/master/install-agent.sh)\' -s',
       $scope.nodeId
    );
    $scope.nodeInstallScript = cmdArray.join(' ');
    $scope.clickToCopy = function() {
      if (!$scope.afterCopy) {
          $scope.form.labels = $scope.getAllNodeLabelIds($scope.selectedLabels);
          glanceHttp.ajaxFormPost($scope, ['cluster.node', {'cluster_id': $stateParams.clusterId}], function (data) {
              $scope.afterCopy = true;
          });
      }
    };

    $scope.changeLabels = function() {
        labelService.changeLabels($scope);
    }

    $scope.labeldNode = function(label) {
        labelService.labeldNode(label, $scope);
    };

    $scope.createLabel = function(newLabelName) {
        labelService.createLabel(newLabelName, $scope);
    };

    $scope.tearLabel = function(label, afterCopy) {
        if (!afterCopy) {
            labelService.tearLabel(label, $scope);
        } else {
            Notification.error('安装命令已生成，标签无法修改，可从该主机的主机详情页面修改。');
        }
    };

    $scope.deleteLabel = function(label) {
        labelService.deleteLabel(label, $scope);
    };
}

addNodeFormCtrl.$inject = ['$rootScope', '$scope', '$state', '$stateParams', 'glanceHttp', 'Notification', 'labelService'];
glanceApp.controller('addNodeFormCtrl', addNodeFormCtrl);
