// The components a step's MDX may use, passed to <Content components={...}>.
// Content files do not import them. The list matches the content contract.
import Why from './Why.astro';
import Idea from './Idea.astro';
import Points from './Points.astro';
import Point from './Point.astro';
import Do from './Do.astro';
import Done from './Done.astro';
import Trap from './Trap.astro';
import Question from './Question.astro';
import LabLink from './LabLink.astro';
import Cmd from './Cmd.astro';
import Query from './Query.astro';
import Figure from './Figure.astro';

export const mdxComponents = { Why, Idea, Points, Point, Do, Done, Trap, Question, LabLink, Cmd, Query, Figure };
