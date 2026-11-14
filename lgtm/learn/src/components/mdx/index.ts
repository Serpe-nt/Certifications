// The components a step's MDX may use, passed to <Content components={...}>.
// Content files do not import them. The list matches the content contract and the article form
// (lgtm/docs/adr/dz-article-format.md).
import Why from './Why.astro';
import Problem from './Problem.astro';
import Idea from './Idea.astro';
import Points from './Points.astro';
import Point from './Point.astro';
import InLab from './InLab.astro';
import Do from './Do.astro';
import Done from './Done.astro';
import Trap from './Trap.astro';
import Remember from './Remember.astro';
import Question from './Question.astro';
import LabLink from './LabLink.astro';
import Cmd from './Cmd.astro';
import Query from './Query.astro';
import Figure from './Figure.astro';
import Flow from './Flow.astro';
import Stage from './Stage.astro';
import Compare from './Compare.astro';
import Col from './Col.astro';
import Figures from './Figures.astro';
import Stat from './Stat.astro';
import Layers from './Layers.astro';
import Layer from './Layer.astro';
import Timeline from './Timeline.astro';
import Event from './Event.astro';
import Pre from './Pre.astro';

export const mdxComponents = {
  Why, Problem, Idea, Points, Point, InLab, Do, Done, Trap, Remember, Question, LabLink, Cmd, Query, Figure,
  Flow, Stage, Compare, Col, Figures, Stat, Layers, Layer, Timeline, Event,
  // Fenced code blocks: MDX renders them through the `pre` component.
  pre: Pre,
};
