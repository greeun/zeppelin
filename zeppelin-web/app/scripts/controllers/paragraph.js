/* Copyright 2014 NFLabs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/**
 * @ngdoc function
 * @name zeppelinWebApp.controller:ParagraphCtrl
 * @description
 * # ParagraphCtrl
 * Controller of the paragraph, manage everything related to the paragraph
 * 
 * @author anthonycorbacho
 */
angular.module('zeppelinWebApp')
        .controller('ParagraphCtrl', function($scope, $rootScope) {

  $scope.paragraph = null;
  $scope.editor = null;
  var editorMode = {scala: 'ace/mode/scala', sql: 'ace/mode/sql', markdown: 'ace/mode/markdown'};

  $scope.forms = {};

  $scope.d3 = {};
  $scope.d3.options = {
      chart: {
        type: '',
        margin: {
          top: 20,
          right: 20,
          bottom: 60,
          left: 45
        },
        useInteractiveGuideline: true,
        transitionDuration:500
      }
    };
  $scope.d3.data = null;
  $scope.d3.config = {
    visible: true, // default: true
    extended: false, // default: false
    disabled: false, // default: false
    autorefresh: false, // default: true
    refreshDataOnly: true // default: false
  };

  // Controller init
  $scope.init = function(newParagraph) {
    $scope.paragraph = newParagraph;
    if ($scope.getResultType() === "TABLE") {
      $scope.loadTableData($scope.paragraph.result);
      $scope.setGraphMode($scope.getGraphMode(), false, false);
    }
  };

  $rootScope.$on('updateParagraph', function(event, data) {
    if (data.paragraph.id === $scope.paragraph.id) {
 
      if ($scope.paragraph.text !== data.paragraph.text) {
        //$scope.paragraph = data.paragraph;
        $scope.paragraph.text = data.paragraph.text;
      }

      /** push the rest */
      $scope.paragraph.aborted = data.paragraph.aborted;
      $scope.paragraph.dateCreated = data.paragraph.dateCreated;
      $scope.paragraph.dateFinished = data.paragraph.dateFinished;
      $scope.paragraph.dateStarted = data.paragraph.dateStarted;
      $scope.paragraph.errorMessage = data.paragraph.errorMessage;
      $scope.paragraph.isEditorOpen = data.paragraph.isEditorOpen;
      $scope.paragraph.isOpen = data.paragraph.isOpen;
      $scope.paragraph.jobName = data.paragraph.jobName;
      $scope.paragraph.status = data.paragraph.status;

      var oldType = $scope.getResultType();
      var newType = $scope.getResultType(data.paragraph);
      var oldGraphMode = $scope.getGraphMode();
      var newGraphMode = $scope.getGraphMode(data.paragraph);

      //console.log("updateParagraph type %o -> %o, mode %o -> %o", oldType, newType, oldGraphMode, newGraphMode);
      
      $scope.paragraph.result = data.paragraph.result;
      $scope.paragraph.settings = data.paragraph.settings;
      
      if (newType==="TABLE") {
        $scope.loadTableData($scope.paragraph.result);
        /** User changed the chart type? */
        if (oldGraphMode !== newGraphMode) {
          $scope.setGraphMode(newGraphMode, false, false);
        } else {
          $scope.setGraphMode(newGraphMode, false, true);
        }
      } else {
        // destroy chart chart, if chart was there
      }
    }
  });
  

  
  
  $scope.sendParagraph = function(data) {
    //console.log('send new paragraph: %o with %o', $scope.paragraph.id, data);
    var parapgraphData = {op: 'RUN_PARAGRAPH', data: {id: $scope.paragraph.id, paragraph: data, params: $scope.paragraph.settings.params}};
    $rootScope.$emit('sendNewEvent', parapgraphData);
  };
  
  var flushTableData = function() {
    if ($scope.paragraph.settings.params._table) {
        delete $scope.paragraph.settings.params._table;
        if ($scope.paragraph.result) {
          delete $scope.paragraph.result;
        }
      }
  };
  
  $scope.closeParagraph = function() {
    console.log('close the note');
    var parapgraphData = {op: 'PARAGRAPH_UPDATE_STATE', data: {id: $scope.paragraph.id, isClose: true, isEditorClose: !$scope.paragraph.isEditorOpen}};
    $rootScope.$emit('sendNewEvent', parapgraphData);
  };
  
  $scope.removeParagraph = function() {
    console.log('remove the note');
    var parapgraphData = {op: 'PARAGRAPH_REMOVE', data: {id: $scope.paragraph.id}};
    $rootScope.$emit('sendNewEvent', parapgraphData);
  };
  
  $scope.openParagraph = function() {
    console.log('open the note');
    var parapgraphData = {op: 'PARAGRAPH_UPDATE_STATE', data: {id: $scope.paragraph.id, isClose: false, isEditorClose: !$scope.paragraph.isEditorOpen}};
    $rootScope.$emit('sendNewEvent', parapgraphData);
  };
  
  $scope.closeEditor = function() {
    console.log('close the note');
    var parapgraphData = {op: 'PARAGRAPH_UPDATE_STATE', data: {id: $scope.paragraph.id, isClose: !$scope.paragraph.isOpen, isEditorClose: true}};
    $rootScope.$emit('sendNewEvent', parapgraphData);
  };
  
  $scope.openEditor = function() {
    console.log('open the note');
    var parapgraphData = {op: 'PARAGRAPH_UPDATE_STATE', data: {id: $scope.paragraph.id, isClose: !$scope.paragraph.isOpen, isEditorClose: false}};
    $rootScope.$emit('sendNewEvent', parapgraphData);
  };

  $scope.loadForm = function(formulaire, params) {
    var value = formulaire.defaultValue;
    if (params[formulaire.name]) {
      value = params[formulaire.name];
    }
    $scope.forms[formulaire.name] = value;
  };

  $scope.aceLoaded = function(_editor) {
    $scope.editor = _editor;
    if (_editor.container.id !== '{{paragraph.id}}_editor') {

      $scope.editor.renderer.setShowGutter(false);
      $scope.editor.setHighlightActiveLine(false);
      $scope.editor.focus();
      var hight = $scope.editor.getSession().getScreenLength() * $scope.editor.renderer.lineHeight + $scope.editor.renderer.scrollBar.getWidth();
      setEditorHeight(_editor.container.id, hight);
      $scope.editor.getSession().on('change', function(e, editSession) {
        hight = editSession.getScreenLength() * $scope.editor.renderer.lineHeight + $scope.editor.renderer.scrollBar.getWidth();
        setEditorHeight(_editor.container.id, hight);
        $scope.editor.resize();
      });

      var code = $scope.editor.getSession().getValue();
      if ( String(code).startsWith('%sql')) {
        $scope.editor.getSession().setMode(editorMode.sql);
      } else if ( String(code).startsWith('%md')) {
        $scope.editor.getSession().setMode(editorMode.markdown);
      } else {
        $scope.editor.getSession().setMode(editorMode.scala);
      }
      
      $scope.editor.commands.addCommand({
        name: 'run',
        bindKey: {win: 'Shift-Enter', mac: 'Shift-Enter'},
        exec: function(editor) {
          var editorValue = editor.getValue();
          if (editorValue) {
            $scope.sendParagraph(editorValue);
          }
        },
        readOnly: false
      });
    }
  };

  var setEditorHeight = function(id, height) {
    $('#' + id).height(height.toString() + 'px');
  };

  $scope.getEditorValue = function() {
    return $scope.editor.getValue();
  };

  $scope.getResultType = function(paragraph){
    var pdata = (paragraph) ? paragraph : $scope.paragraph;
    if (pdata.result && pdata.result.type) {
      return pdata.result.type;
    } else {
      return "TEXT";
    }
  };

  $scope.getGraphMode = function(paragraph){
    var pdata = (paragraph) ? paragraph : $scope.paragraph;
    if (pdata.settings.params && pdata.settings.params._table && pdata.settings.params._table.mode) {
      return pdata.settings.params._table.mode;
    } else {
      return "table";
    }
  };

  $scope.loadTableData = function(result) {
    if (!result) {
      return;
    }
    if (result.type === 'TABLE') {
      var columnNames = [];
      var rows = [];
      var array = [];
      var textRows = result.msg.split('\n');

      for (var i = 0; i < textRows.length; i++) {
        var textRow = textRows[i];
        if (textRow === '') {
          continue;
        }
        var textCols = textRow.split('\t');
        var cols = [];
        var cols2 = [];
        for (var j = 0; j < textCols.length; j++) {
          var col = textCols[j];
          if (i === 0) {
            columnNames.push(col);
          } else {
            cols.push(col);
            cols2.push({key: columnNames[i], value: col});
          }
        }
        if (i !== 0) {
          rows.push(cols);
          array.push(cols2);
        }
      }
      result.msgTable = array;
      result.columnNames = columnNames;
      result.rows = rows;
    }
  };

  $scope.setGraphMode = function(type, emit, refresh) {
    //console.log("setGraphMode %o %o %o", type, emit, refresh);
    if (emit) {
      setNewMode(type);
    } else {
      if (!type || type === 'table') {
      }
      else if (type === 'multiBarChart') {
        setMultiBarChart($scope.paragraph.result, refresh);
      }
      else if (type === 'pieChart') {
      }
      else if (type === 'stackedAreaChart') {
        setStackedAreaChart($scope.paragraph.result, refresh);
      }
      else if (type === 'lineChart') {
        setLineChart($scope.paragraph.result, refresh);
      }
    }
  };

  var setNewMode = function(newMode) {
    $scope.paragraph.settings.params._table = {mode: newMode, height: 300.0};
    var parapgraphData = {
      op: 'COMMIT_PARAGRAPH',
      data: {
        id: $scope.paragraph.id,
        paragraph: $scope.paragraph.text,
        params: $scope.paragraph.settings.params
      }};
    $rootScope.$emit('sendNewEvent', parapgraphData);
  };

  var setMultiBarChart = function(data, refresh) {
    var xColIndex = 0;
    var yColIndexes = [];
    var d3g = [];
    // select yColumns. 
    for (var i = 0; i < data.columnNames.length; i++) {
      if (i !== xColIndex) {
        yColIndexes.push(i);
        d3g.push({
          values: [],
          key: data.columnNames[i]
        });
      }
    }

    for (i = 0; i < data.rows.length; i++) {
      var row = data.rows[i];
      for (var j = 0; j < yColIndexes.length; j++) {
        var xVar = row[xColIndex];
        var yVar = row[yColIndexes[j]];
        d3g[j].values.push({
          x: isNaN(xVar) ? xVar : parseFloat(xVar),
          y: parseFloat(yVar)
        });
      }
    }

    if ($scope.d3.data === null || !refresh) {
      $scope.d3.data = d3g;

      $scope.d3.options.chart.type = 'multiBarChart';
      $scope.d3.options.chart.height = $scope.paragraph.settings.params._table.height;
      $scope.d3.config.autorefresh = true;
    } else {
      if ($scope.d3.api) {
        $scope.d3.api.updateWithData(d3g);
      }
    }
  };

  var setLineChart = function(data, refresh) {
    var xColIndex = 0;
    var yColIndexes = [];
    var d3g = [];
    // select yColumns. 
    for (var i = 0; i < data.columnNames.length; i++) {
      if (i !== xColIndex) {
        yColIndexes.push(i);
        d3g.push({
          values: [],
          key: data.columnNames[i]
        });
      }
    }

    for (i = 0; i < data.rows.length; i++) {
      var row = data.rows[i];
      for (var j = 0; j < yColIndexes.length; j++) {
        var xVar = row[xColIndex];
        var yVar = row[yColIndexes[j]];
        d3g[j].values.push({
          x: isNaN(xVar) ? xVar : parseFloat(xVar),
          y: parseFloat(yVar)
        });
      }
    }
    if ($scope.d3.data === null || !refresh) {
      $scope.d3.data = d3g;
      $scope.d3.options.chart.type = 'lineChart';
      $scope.d3.options.chart.height = $scope.paragraph.settings.params._table.height;
      $scope.d3.config.autorefresh = true;
      //if ($scope.d3.api) {
        //$scope.d3.api.updateWithOptions($scope.d3.options);
      //}
    } else {
      if ($scope.d3.api) {
        $scope.d3.api.updateWithData(d3g);
      }
    }
  };

  var setStackedAreaChart = function(data, refresh) {
    var xColIndex = 0;
    var yColIndexes = [];
    var d3g = [];
    // select yColumns. 
    for (var i = 0; i < data.columnNames.length; i++) {
      if (i !== xColIndex) {
        yColIndexes.push(i);
        d3g.push({
          values: [],
          key: data.columnNames[i]
        });
      }
    }

    for (i = 0; i < data.rows.length; i++) {
      var row = data.rows[i];
      for (var j = 0; j < yColIndexes.length; j++) {
        var xVar = row[xColIndex];
        var yVar = row[yColIndexes[j]];
        d3g[j].values.push({
          x: isNaN(xVar) ? xVar : parseFloat(xVar),
          y: parseFloat(yVar)
        });
      }
    }
    
    if ($scope.d3.data === null || !refresh) {
      $scope.d3.data = d3g;

      $scope.d3.options.chart.type = 'stackedAreaChart';
      $scope.d3.options.chart.height = $scope.paragraph.settings.params._table.height;
      $scope.d3.config.autorefresh = true;
      //if ($scope.d3.api) {
        //$scope.d3.api.updateWithOptions($scope.d3.options);
      //}
    } else {
      if ($scope.d3.api) {
        $scope.d3.api.updateWithData(d3g);
      }
    }
  };

  $scope.isGraphMode = function(graphName) {
    if ($scope.getResultType() === "TABLE" && $scope.getGraphMode()===graphName) {
      return true;
    } else {
      return false;
    }
  };
  
  /** Utility function */
  if (typeof String.prototype.startsWith !== 'function') {
    String.prototype.startsWith = function(str) {
      return this.slice(0, str.length) === str;
    };
  }
});