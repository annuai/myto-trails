Pod::Spec.new do |s|
  s.name           = 'OfflineRouter'
  s.version        = '1.0.0'
  s.summary        = 'Valhalla road routing on the phone'
  s.description    = 'Routes against a downloaded region of Valhalla routing tiles with valhalla-mobile, so directions work with no signal.'
  s.license        = 'UNLICENSED'
  s.author         = 'Myto Moto'
  s.homepage       = 'https://myto.app'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  # valhalla-mobile ships as a Swift package only; React Native's helper adds it to this pod's target.
  spm_dependency(s,
    url: 'https://github.com/Rallista/valhalla-mobile.git',
    requirement: { kind: 'exactVersion', version: '0.6.4' },
    products: ['Valhalla'])
  # ValhallaConfig (the engine's settings, pointed at a region's tiles) is in valhalla-mobile's models package, a separate product.
  spm_dependency(s,
    url: 'https://github.com/Rallista/valhalla-openapi-models-swift.git',
    requirement: { kind: 'upToNextMinorVersion', minimumVersion: '0.6.0' },
    products: ['ValhallaConfigModels'])
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
end
