class ResamplingAlgorithm {
    static NEAREST_NEIGHBOR = 0;
    static LINEAR = 1;
    static BILINEAR = ResamplingAlgorithm.LINEAR;
    static MULTISAMPLE_LINEAR = 3;
    static SUPER_SAMPLING = ResamplingAlgorithm.MULTISAMPLE_LINEAR;
    static ANISOTROPIC = 4;
    static HIGH_QUALITY_CUBIC = 5;
    static BICUBIC = ResamplingAlgorithm.HIGH_QUALITY_CUBIC;
}
