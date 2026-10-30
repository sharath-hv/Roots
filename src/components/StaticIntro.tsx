import { MEDIA } from '../config';
import { stillUrl } from '../lib/media';
import { FoldCopy } from './FoldCopy';
import { Stall } from './Stall';
import { StallCaption } from './Journey';

/** Reduced motion, or the video failed to load: the fold and the stall as ordinary sections. */
export function StaticIntro() {
  return (
    <>
      <section className="static-fold" aria-label="Welcome">
        <img className="static-fold__bg" src={stillUrl(MEDIA.clips.walkIn.last)} alt="" {...{ fetchpriority: "high" }} />
        <FoldCopy />
      </section>
      <section className="static-stall" id="stall" aria-label="The stall">
        <Stall src={stillUrl(MEDIA.clips.hutOpen.last)} active />
        <StallCaption />
      </section>
    </>
  );
}
