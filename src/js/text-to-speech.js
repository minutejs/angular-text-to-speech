(function () {
    'use strict';

    angular.module('textToSpeech', ['MinuteCookie'])
        .factory('$tts', ['$q', '$timeout', '$cookie', '$http', function ($q, $timeout, $cookie, $http) {
            var ttsService = {};
            var voices = [];

            ttsService.getVoices = function () {
                var deferred = $q.defer();

                if (voices.length > 0) {
                    $timeout(function () { deferred.resolve(voices); });
                } else {
                    $http.post('/tts/voices').then(function (obj) {
                        voices = obj.data.voices;
                        deferred.resolve(voices);
                    });
                }

                return deferred.promise;
            };

            return ttsService;
        }])
        .directive('textToSpeech', ['$compile', '$timeout', '$tts', '$cookie', '$ui', '$http', function ($compile, $timeout, $tts, $cookie, $ui, $http) {
            return {
                restrict: 'A',
                replace: true,
                require: 'ngModel',
                scope: {text: '@'},
                templateUrl: '/static/bower_components/angular-text-to-speech/src/templates/text-to-speech.html',
                link: function ($scope, element, attrs, ngModel) {
                    $scope.init = function () {
                        $scope.sound = ngModel.$viewValue;
                        $scope.$watch('sound', function () {
                            ngModel.$setViewValue($scope.sound);
                        });
                    };

                    ngModel.$render = $scope.init;
                },
                controller: function ($scope, $element) {
                    $scope.settings = {};

                    $scope.init = function () {
                        $scope.settings.show_all = $cookie.getCookie('tts_show_all') === 'true';

                        $scope.$watch('settings', function () {
                            if ($scope.settings.lang) {
                                $cookie.setCookie('tts_lang', $scope.settings.lang, 365);
                            }

                            $cookie.setCookie('tts_show_all', $scope.settings.show_all, 365);
                        }, true);

                        $tts.getVoices().then(function (voices) {
                            if (voices && voices.length > 0) {
                                $scope.voices = voices;
                                $scope.settings.lang = $cookie.getCookie('tts_lang') || 'English, Britain';
                            }
                        });
                    };

                    $scope.langFilter = function (value, index, array) {
                        return $scope.settings.show_all || /english/i.test(value.LanguageName);
                    };

                    $scope.createTTS = function () {
                        $scope.sound = null;
                        $scope.loading = true;
                        var error = function (err) { $ui.toast(err || 'The sound file could not be generated at this time. Please try selecting a different voice and try again.', 'error');};

                        $http.post('/tts/generate', {voice: $scope.settings.lang, text: $scope.text})
                            .then(
                                function (obj) {
                                    if (obj.data && obj.data.url) {
                                        $scope.sound = obj.data.url;
                                    } else {
                                        error();
                                    }
                                },
                                function (obj) {
                                    error(obj.data)
                                })
                            .finally(
                                function () {
                                    $scope.loading = false;
                                }
                            );
                    };

                    $timeout($scope.init);
                }
            };
        }]);
})();
